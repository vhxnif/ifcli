/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type { RunnableToolFunctionWithoutParse } from 'openai/lib/RunnableFunction.mjs'
import { Flow, Node } from 'pocketflow'
import type { GeneralSetting } from '../config/app-setting'
import type { ChatInfo, MessageContent } from '../store/store-types'
import { isEmpty, println, uuid } from '../util/common-utils'
import type { LLMOutputHandler } from './llm-output-handler'
import { SilentOutputHandler } from './llm-output-handler'
import type {
    LLMMessage,
    LLMParam,
    LLMResultChunk,
    LLMToolsCallParam,
} from './llm-types'
import { assistant, system, user } from './llm-utils'
import type MCPClient from './mcp-client'
import {
    generateTempTopicName,
    generateTopicName,
    isTempTopicName,
} from './topic-generator'

export type AskShare = LLMParam & {
    chat: ChatInfo
    systemPrompt: string
    withContext: boolean
    contextLimit: number
    withMCP: boolean
    topicId?: string
    resultChunk?: LLMResultChunk
    tools?: {
        id: string
        mcpServer: string
        mcpVersion: string
        funName: string
        f: RunnableToolFunctionWithoutParse
    }[]
    mcps?: MCPClient[]
    generalSetting?: GeneralSetting
    outputHandler?: LLMOutputHandler
    isNewTopic?: boolean
    topicModel?: string
}

class SystemPromptNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { systemPrompt } = shared
        if (isEmpty(systemPrompt)) {
            return
        }
        shared.messages.push(system(systemPrompt))
    }
}

class PresetNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { chat } = shared
        const presetMessage = chat.preset.get().flatMap(
            (it) =>
                [
                    { role: 'user', content: it.user },
                    { role: 'assistant', content: it.assistant },
                ] as LLMMessage[],
        )
        shared.messages = [...shared.messages, ...presetMessage]
    }
}

class ContextNode extends Node<AskShare> {
    private readonly client: OpenAI

    constructor(client: OpenAI) {
        super()
        this.client = client
    }

    override async prep(shared: AskShare): Promise<void> {
        const { chat, userContent, messages, withContext, contextLimit } =
            shared
        const tpfun = chat.topic
        const tp = tpfun.get()

        let needGenerateTopic = false
        let seedContent = userContent

        if (!tp || shared.newTopic) {
            shared.topicId = tpfun.new(generateTempTopicName())
            shared.isNewTopic = true
            needGenerateTopic = true
        } else {
            shared.topicId = tp.id
            shared.isNewTopic = false

            if (isTempTopicName(tp.content)) {
                needGenerateTopic = true
                const firstMsg = chat.topic.message.first(tp.id)
                if (firstMsg) {
                    seedContent = firstMsg.content
                }
            }
        }

        if (needGenerateTopic) {
            shared.topicNamePromise = generateTopicName(
                seedContent,
                this.client,
                shared.topicModel || shared.model,
            )
        }

        const context = withContext
            ? tpfun.message.list(shared.topicId, contextLimit).map((it) => {
                  if (it.role === 'user') {
                      return user(it.content)
                  }
                  return assistant(it.content)
              })
            : []
        shared.messages = [...messages, ...context]
    }
}

class UserNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { userContent } = shared
        shared.messages.push(user(userContent))
    }
}

class ToolsNode extends Node<AskShare> {
    private readonly mcps: MCPClient[]

    constructor(mcps: MCPClient[]) {
        super()
        this.mcps = mcps
    }

    override async prep(shared: AskShare): Promise<void> {
        if (isEmpty(this.mcps)) {
            return
        }
        if (!shared.withMCP) {
            return
        }
        const { mcpServers } = shared.chat.configExt.value
        if (isEmpty(mcpServers)) {
            return
        }
        const filterActiveMCPServer = (m: MCPClient) => {
            const one = mcpServers.find(
                (it) => it.name === m.name && it.version === m.version,
            )
            return one !== void 0
        }
        const mcps = this.mcps.filter(filterActiveMCPServer)
        if (isEmpty(mcps)) {
            return
        }
        shared.mcps = mcps

        const results = await Promise.allSettled(
            mcps.map(async (it) => {
                await it.connect()
                if (!it.isConnected) {
                    const err = it.connectionErr
                    throw new Error(
                        `MCP ${it.name}/${it.version} connection failed: ${err?.message ?? 'unknown error'}`,
                    )
                }
                return await it.tools()
            }),
        )

        const tools = results
            .flatMap((result) => {
                if (result.status === 'fulfilled') {
                    return result.value
                }
                println(
                    `MCP connection warning: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
                )
                return []
            })
            .flat()

        shared.tools = tools.length > 0 ? tools : undefined
    }

    override async execFallback(
        _prepRes: unknown,
        _error: Error,
    ): Promise<void> {
        if (this.mcps) {
            await Promise.allSettled(this.mcps.map((it) => it.close()))
        }
    }
}

class AiRouterNode extends Node<AskShare> {
    override async post(
        shared: AskShare,
        _prepRes: unknown,
        _execRes: unknown,
    ): Promise<string | undefined> {
        const { tools } = shared
        if (tools) {
            return 'toolsCall'
        }
        return 'streamCall'
    }
}

class ToolsCallNode extends Node<AskShare> {
    private readonly client: OpenAI

    constructor(client: OpenAI) {
        super()
        this.client = client
    }

    override async prep(shared: AskShare): Promise<LLMToolsCallParam> {
        return { ...shared } as LLMToolsCallParam
    }

    override async exec(prepRes: LLMToolsCallParam): Promise<LLMResultChunk> {
        const { model, temperature, tools, messages, outputHandler, noStream } =
            prepRes
        const handler = outputHandler ?? new SilentOutputHandler()
        let hasReasoningContent = false
        let hasReasoningStopped = false
        let hasToolCallingStarted = false

        try {
            const runner = this.client.chat.completions
                .runTools({
                    model,
                    temperature,
                    tools: tools.map((it) => it.f),
                    messages,
                    stream: true,
                })
                .on(
                    'chunk',
                    (chunk: OpenAI.Chat.Completions.ChatCompletionChunk) => {
                        const delta = chunk.choices[0]
                            ?.delta as OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
                            reasoning_content?: string
                            reasoning?: string
                        }
                        const reasoning =
                            delta?.reasoning || delta?.reasoning_content || ''
                        const content = delta?.content || ''

                        if (reasoning) {
                            hasReasoningContent = true
                            handler.onReasoningChunk(reasoning)
                        }

                        if (
                            hasReasoningContent &&
                            content &&
                            !hasReasoningStopped
                        ) {
                            handler.onReasoningComplete()
                            hasReasoningStopped = true
                        }
                    },
                )
                .on('tool_calls.function.arguments.delta', () => {
                    if (!hasToolCallingStarted) {
                        hasToolCallingStarted = true
                        handler.onStateChange('toolCalling')
                    }
                })
                .on(
                    'tool_calls.function.arguments.done',
                    (it: { name: string; arguments: string }) => {
                        const f = tools.find((i) => i.id === it.name)!
                        handler.onToolCall(
                            f?.mcpServer,
                            f?.mcpVersion,
                            f?.funName,
                            it.arguments,
                        )
                    },
                )
                .on('functionToolCallResult', (it: string) => {
                    handler.onToolResult(it)
                })
                .on('content', (it: string) => {
                    handler.onContentChunk(it)
                })
            await runner.finalChatCompletion()

            if (hasReasoningContent && !hasReasoningStopped) {
                handler.onReasoningComplete()
            }

            handler.onContentComplete()
            const result = handler.getResult()
            if (noStream) {
                println(result.assistant.join(''))
            }
            return result
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err))
            handler.onError(error)
            handler.onContentComplete()
            const result = handler.getResult()
            result.assistant.push(
                `\n\n[MCP Error] Tool execution failed: ${error.message}. Please try again or disable MCP tools.`,
            )
            return result
        }
    }

    override async post(
        shared: AskShare,
        prepRes: LLMToolsCallParam,
        execRes: LLMResultChunk,
    ): Promise<string | undefined> {
        shared.resultChunk = execRes
        await Promise.allSettled(prepRes.mcps.map((it) => it.close()))
        return undefined
    }

    override async execFallback(
        prepRes: LLMToolsCallParam,
        _error: Error,
    ): Promise<void> {
        await Promise.allSettled(prepRes.mcps.map((it) => it.close()))
    }
}

class StreamCallNode extends Node<AskShare> {
    private readonly client: OpenAI

    constructor(client: OpenAI) {
        super()
        this.client = client
    }

    override async prep(shared: AskShare): Promise<LLMParam> {
        return {
            ...shared,
        }
    }

    override async exec(prepRes: LLMParam): Promise<LLMResultChunk> {
        const { messages, model, temperature, outputHandler, noStream } =
            prepRes
        const handler = outputHandler ?? new SilentOutputHandler()
        let lastChunk: string = ''
        let hasReasoningContent: boolean = false
        let hasReasoningStopped: boolean = false

        try {
            const stream = await this.client.chat.completions.create({
                messages,
                model,
                temperature,
                stream: true,
            })
            for await (const chunk of stream) {
                const delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
                    reasoning_content?: string
                    reasoning?: string
                } = chunk.choices[0]?.delta
                const reasoning =
                    delta.reasoning || delta.reasoning_content || ''
                const content = delta.content || ''

                if (reasoning) {
                    hasReasoningContent = true
                    handler.onReasoningChunk(reasoning)
                }

                const combinedChunks = lastChunk + content
                lastChunk = content

                if (
                    combinedChunks.includes('###Response') ||
                    content === '```'
                ) {
                    if (hasReasoningContent && !hasReasoningStopped) {
                        handler.onReasoningComplete()
                        hasReasoningStopped = true
                    }
                }

                if (hasReasoningContent && content && !hasReasoningStopped) {
                    handler.onReasoningComplete()
                    hasReasoningStopped = true
                }

                if (content) {
                    handler.onContentChunk(content)
                }
            }

            handler.onContentComplete()
            const result = handler.getResult()
            if (noStream) {
                println(result.assistant.join(''))
            }
            return result
        } catch (e: unknown) {
            handler.onError(e instanceof Error ? e : new Error(String(e)))
            throw e
        }
    }

    override async post(
        shared: AskShare,
        _prepRes: LLMParam,
        execRes: LLMResultChunk,
    ): Promise<string | undefined> {
        shared.resultChunk = execRes
        return undefined
    }
}

class StoreNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { chat, userContent, resultChunk, topicId, topicNamePromise } =
            shared
        if (!resultChunk) {
            return
        }
        const { tools, assistant, reasoning } = resultChunk
        const pairKey = uuid()
        const messages: MessageContent[] = [
            { topicId: topicId!, role: 'user', content: userContent, pairKey },
            {
                topicId: topicId!,
                role: 'assistant',
                content: assistant.join(''),
                pairKey,
            },
        ]
        if (!isEmpty(reasoning)) {
            messages.push({
                topicId: topicId!,
                role: 'reasoning',
                content: reasoning.join(''),
                pairKey,
            })
        }
        if (!isEmpty(tools)) {
            messages.push({
                topicId: topicId!,
                role: 'toolscall',
                content: JSON.stringify(tools),
                pairKey,
            })
        }
        chat.topic.message.save(messages)

        if (topicNamePromise) {
            try {
                const resolvedTopicName = await topicNamePromise
                if (resolvedTopicName) {
                    chat.topic.update(topicId!, resolvedTopicName)
                }
            } catch {
                // Failed to generate topic name, will retry on next message
            }
        }
    }
}

const askFlow = async ({
    chat,
    client,
    userContent,
    mcps,
    generalSetting,
    outputHandler,
    noStream = false,
    newTopic,
    topicModel,
}: {
    chat: ChatInfo
    client: OpenAI
    userContent: string
    mcps: MCPClient[]
    generalSetting: GeneralSetting
    outputHandler?: LLMOutputHandler
    noStream?: boolean
    newTopic?: boolean
    topicModel?: string
}) => {
    const { model, scenario, sysPrompt, withContext, contextLimit, withMCP } =
        chat.config.value
    const share: AskShare = {
        chat,
        userContent,
        messages: [],
        model,
        temperature: scenario,
        systemPrompt: sysPrompt,
        withContext: withContext === 1,
        contextLimit,
        withMCP: withMCP === 1,
        generalSetting,
        theme: generalSetting.theme,
        noStream,
        newTopic,
        outputHandler,
        topicModel,
    }

    const systemPrompt = new SystemPromptNode()
    const preset = new PresetNode()
    const context = new ContextNode(client)
    const userNode = new UserNode()
    const tools = new ToolsNode(mcps)
    const router = new AiRouterNode()

    const storeChat = new StoreNode()
    const toolsCall = new ToolsCallNode(client)
    const streamCall = new StreamCallNode(client)

    toolsCall.next(storeChat)
    streamCall.next(storeChat)

    systemPrompt
        .next(preset)
        .next(context)
        .next(userNode)
        .next(tools)
        .next(router)
        .on('toolsCall', toolsCall)
        .on('streamCall', streamCall)

    await new Flow(systemPrompt).run(share)
}

export { askFlow }
