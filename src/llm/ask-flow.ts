/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type {
    ChatCompletionChunk,
    ChatCompletionFunctionTool,
    ChatCompletionMessage,
    ChatCompletionMessageParam,
} from 'openai/resources'
import { Flow, Node } from 'pocketflow'
import type { GeneralSetting } from '../config/app-setting'
import type { ChatInfo, MessageContent } from '../store/store-types'
import { isEmpty, println, uuid } from '../util/common-utils'
import type { LLMOutputHandler } from './llm-output-handler'
import type { LLMMessage, LLMParam, LLMToolsCallParam } from './llm-types'
import { assistant, system, user } from './llm-utils'
import type MCPClient from './mcp-client'
import type { ToolDef } from './mcp-client'
import {
    generateTempTopicName,
    generateTopicName,
    isTempTopicName,
} from './topic-generator'

function messageReducer(
    previous: ChatCompletionMessage,
    item: ChatCompletionChunk,
): ChatCompletionMessage {
    const reduce = (acc: any, delta: MyDelta) => {
        acc = { ...acc }
        for (const [key, value] of Object.entries(delta)) {
            if (acc[key] === undefined || acc[key] === null) {
                acc[key] = value
                //  OpenAI.Chat.Completions.ChatCompletionMessageToolCall does not have a key, .index
                if (Array.isArray(acc[key])) {
                    for (const arr of acc[key]) {
                        delete arr.index
                    }
                }
            } else if (
                typeof acc[key] === 'string' &&
                typeof value === 'string'
            ) {
                acc[key] += value
            } else if (
                typeof acc[key] === 'number' &&
                typeof value === 'number'
            ) {
                acc[key] = value
            } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
                const accArray = acc[key]
                for (let i = 0; i < value.length; i++) {
                    const { index, ...chunkTool } = value[i]
                    if (index - accArray.length > 1) {
                        throw new Error(
                            `Error: An array has an empty value when tool_calls are constructed. tool_calls: ${accArray}; tool: ${value}`,
                        )
                    }
                    accArray[index] = reduce(accArray[index], chunkTool)
                }
            } else if (
                typeof acc[key] === 'object' &&
                typeof value === 'object'
            ) {
                acc[key] = reduce(acc[key], value)
            }
        }
        return acc
    }
    const choice = item.choices[0]
    if (!choice) {
        // chunk contains information about usage and token counts
        return previous
    }
    return reduce(previous, choice.delta) as ChatCompletionMessage
}

type MessageParam = ChatCompletionMessageParam & {
    reasoning_content: string
}

function toStoreMessage(
    topicId: string,
    msgs: MessageParam[],
): MessageContent[] {
    const pairKey = uuid()

    return msgs
        .filter((it) => it.role !== 'tool')
        .flatMap((it) => {
            if (it.role === 'user') {
                return [
                    {
                        topicId,
                        role: 'user',
                        content: it.content as string,
                        pairKey,
                    },
                ] as MessageContent[]
            }
            if (it.role === 'assistant') {
                const arr: MessageContent[] = []
                if (it.reasoning_content) {
                    arr.push({
                        topicId,
                        role: 'reasoning',
                        content: it.reasoning_content,
                        pairKey,
                    })
                }
                if (it.content) {
                    arr.push({
                        topicId,
                        role: 'assistant',
                        content: it.content as string,
                        pairKey,
                    })
                }
                if (it.tool_calls) {
                    const tools = it.tool_calls
                    arr.push({
                        topicId,
                        role: 'toolscall',
                        content: JSON.stringify(
                            tools.map((t) => {
                                const f = t as ChatCompletionFunctionTool
                                return {
                                    function: f.function,
                                    result: msgs.find(
                                        (m) =>
                                            m.role === 'tool' &&
                                            m.tool_call_id === t.id,
                                    )?.content,
                                }
                            }),
                        ),
                        pairKey,
                    })
                }
                return arr
            }
            return []
        })
}

export type AskShare = LLMParam & {
    chat: ChatInfo
    systemPrompt: string
    withContext: boolean
    contextLimit: number
    withMCP: boolean
    topicId?: string
    resultMessage?: MessageContent[]
    tools?: ToolDef[]
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

    override async exec(prepRes: LLMParam): Promise<MessageParam[]> {
        const { messages, model, temperature, outputHandler, noStream } =
            prepRes
        const handler = outputHandler!
        try {
            const msgs = messages.map((it) => it as ChatCompletionMessageParam)
            const stream = await this.client.chat.completions.create({
                messages: msgs,
                model,
                temperature,
                stream: true,
            })
            let message = {} as ChatCompletionMessage
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta as MyDelta
                const reasoning =
                    delta.reasoning || delta.reasoning_content || ''
                const content = delta.content || ''
                if (reasoning) {
                    handler.onReasoningChunk(reasoning)
                }
                if (content) {
                    handler.onContentChunk(content)
                }
                message = messageReducer(message, chunk)
            }
            handler.onContentComplete()
            msgs.push(message)
            if (noStream) {
                println(message.content)
            }
            return msgs as MessageParam[]
        } catch (e: unknown) {
            handler.onError(e instanceof Error ? e : new Error(String(e)))
            throw e
        }
    }

    override async post(
        shared: AskShare,
        _prepRes: LLMParam,
        execRes: MessageParam[],
    ): Promise<string | undefined> {
        shared.resultMessage = toStoreMessage(shared.topicId!, execRes)
        return void 0
    }
}

type MyDelta = OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
    reasoning_content?: string
    reasoning?: string
}

class StreamToolsCallNode extends Node<AskShare> {
    private readonly client: OpenAI

    constructor(client: OpenAI) {
        super()
        this.client = client
    }

    override async prep(shared: AskShare): Promise<LLMToolsCallParam> {
        return { ...shared } as LLMToolsCallParam
    }

    override async exec(prepRes: LLMToolsCallParam): Promise<MessageParam[]> {
        const { model, temperature, tools, messages, outputHandler, noStream } =
            prepRes
        const handler = outputHandler!
        const msgs = messages.map((it) => it as ChatCompletionMessageParam)
        while (true) {
            const stream = await this.client.chat.completions.create({
                model,
                messages: msgs,
                temperature,
                tools: tools.map((it) => it.def),
                stream: true,
            })
            let message = {} as ChatCompletionMessage
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta as MyDelta
                const reasoning =
                    delta?.reasoning || delta?.reasoning_content || ''
                const content = delta?.content || ''
                if (reasoning) {
                    handler.onReasoningChunk(reasoning)
                }
                if (content) {
                    handler.onContentChunk(content)
                }
                message = messageReducer(message, chunk)
            }
            handler.onContentComplete()
            msgs.push(message)
            if (!message.tool_calls) {
                if (noStream) {
                    println(message.content)
                }
                return msgs as MessageParam[]
            }
            for (const toolCall of message.tool_calls) {
                if (toolCall.type !== 'function') {
                    throw new Error(
                        `Unexpected tool call type: ${toolCall.type}`,
                    )
                }
                const f = toolCall.function
                const args = JSON.parse(f.arguments)
                handler.onToolCall(f.name)
                const result = await tools
                    .find(
                        (it) =>
                            (it.def as ChatCompletionFunctionTool).function
                                .name === f.name,
                    )
                    ?.call(args)
                const resultJson = JSON.stringify(result)
                handler.onToolResult(resultJson)
                const newMessage = {
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: toolCall.function.name,
                    content: resultJson,
                }
                msgs.push(newMessage)
            }
        }
    }

    override async post(
        shared: AskShare,
        prepRes: LLMToolsCallParam,
        execRes: MessageParam[],
    ): Promise<string | undefined> {
        shared.resultMessage = toStoreMessage(shared.topicId!, execRes)
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

class StoreNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { chat, resultMessage, topicId, topicNamePromise } = shared
        if (!resultMessage) {
            return
        }
        chat.topic.message.save(resultMessage)

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
    noStream,
    newTopic,
    topicModel,
}: {
    chat: ChatInfo
    client: OpenAI
    userContent: string
    mcps: MCPClient[]
    generalSetting: GeneralSetting
    noStream: boolean
    outputHandler: LLMOutputHandler
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
        newTopic,
        outputHandler,
        topicModel,
        noStream,
    }

    const systemPrompt = new SystemPromptNode()
    const preset = new PresetNode()
    const context = new ContextNode(client)
    const userNode = new UserNode()
    const tools = new ToolsNode(mcps)
    const router = new AiRouterNode()

    const storeChat = new StoreNode()
    const toolsCall = new StreamToolsCallNode(client)
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
