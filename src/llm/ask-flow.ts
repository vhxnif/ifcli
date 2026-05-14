/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources'
import { Flow, Node } from 'pocketflow'
import type { GeneralSetting } from '../config/app-setting'
import type { ChatInfo, MessageContent } from '../store/store-types'
import { isEmpty, println } from '../util/common-utils'
import type { LLMOutputHandler } from './llm-output-handler'
import type { LLMMessage, LLMParam, LLMToolsCallParam } from './llm-types'
import { assistant, system, user } from './llm-utils'
import type MCPClient from './mcp-client'
import {
    type StreamEvent,
    stream,
    streamTools,
    toStoreMessage,
} from './open-ai-helper'
import type { CustomTool, ToolDef } from './tool'
import { toolsGroup, toolsParse } from './tool'
import {
    generateTempTopicName,
    generateTopicName,
    isTempTopicName,
} from './topic-generator'

function eventHandler(
    handler: LLMOutputHandler,
    noStream: boolean,
    { type, value }: StreamEvent,
) {
    if (type === 'delta_reasoning') {
        handler.onReasoningChunk(value)
    }
    if (type === 'delta_content') {
        handler.onContentChunk(value)
    }
    if (type === 'delta_tools') {
        handler.onToolCallChunk()
    }
    if (type === 'content') {
        if (noStream) {
            println(value)
        }
    }
    if (type === 'toolcall') {
        handler.onToolCall(value.name)
    }
    if (type === 'toolcall_result') {
        handler.onToolResult(value)
    }
    if (type === 'all_done') {
        handler.stop()
    }
}

type MessageParam = ChatCompletionMessageParam & {
    reasoning_content: string
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
            generateTopicName(
                seedContent,
                this.client,
                shared.topicModel || shared.model,
                (s) => chat.topic.update(shared.topicId!, s),
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
    private readonly customTools: CustomTool[]

    constructor(mcps: MCPClient[], customTools: CustomTool[]) {
        super()
        this.mcps = mcps
        this.customTools = customTools
    }

    override async prep(shared: AskShare): Promise<void> {
        const mcpTools = await this.mcpTools(shared)
        const cusTools = toolsParse(this.filterActiveCustomTools(shared))
        if (mcpTools.length > 0 || cusTools.length > 0) {
            shared.tools = toolsGroup([...mcpTools, ...cusTools])
        }
    }

    private filterActiveCustomTools(shared: AskShare) {
        const { customTools } = shared.chat.configExt.value
        if (isEmpty(customTools)) {
            return []
        }
        const f = (t: CustomTool) => {
            const { def, group } = t
            const name = def.function.name
            const one = customTools.find(
                (it) => it.name === name && it.group === group,
            )
            return one !== void 0
        }

        return this.customTools.filter((it) => f(it))
    }

    private async mcpTools(shared: AskShare) {
        if (isEmpty(this.mcps)) {
            return []
        }
        if (!shared.withMCP) {
            return []
        }
        const { mcpServers } = shared.chat.configExt.value
        if (isEmpty(mcpServers)) {
            return []
        }
        const filterActiveMCPServer = (m: MCPClient) => {
            const one = mcpServers.find(
                (it) => it.name === m.name && it.version === m.version,
            )
            return one !== void 0
        }
        const mcps = this.mcps.filter(filterActiveMCPServer)
        if (isEmpty(mcps)) {
            return []
        }
        shared.mcps = mcps
        const results = await Promise.allSettled(
            mcps.map(async (it) => {
                try {
                    await it.connect()
                    if (!it.isConnected) {
                        const err = it.connectionErr
                        throw new Error(
                            `MCP ${it.name}/${it.version} connection failed: ${err?.message ?? 'unknown error'}`,
                        )
                    }
                    return await it.tools()
                } catch (e: unknown) {
                    println(e)
                    try {
                        await it.close()
                    } catch (_: unknown) {}
                    return []
                }
            }),
        )
        return results
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
    }

    override async execFallback(
        _prepRes: unknown,
        _error: Error,
    ): Promise<void> {}
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
            return await stream(
                this.client,
                { messages: msgs, model, temperature },
                (e: StreamEvent) => eventHandler(handler, noStream, e),
            )
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
        try {
            return await streamTools(
                this.client,
                {
                    messages: messages.map(
                        (it) => it as ChatCompletionMessageParam,
                    ),
                    model,
                    temperature,
                    tools,
                },
                (e: StreamEvent) => eventHandler(handler, noStream, e),
            )
        } catch (e: unknown) {
            handler.onError(e instanceof Error ? e : new Error(String(e)))
            throw e
        }
    }

    override async post(
        shared: AskShare,
        prepRes: LLMToolsCallParam,
        execRes: MessageParam[],
    ): Promise<string | undefined> {
        if (execRes && execRes.length > 0) {
            shared.resultMessage = toStoreMessage(shared.topicId!, execRes)
        }
        if (prepRes.mcps) {
            await Promise.allSettled(prepRes.mcps.map((it) => it.close()))
        }
        return void 0
    }

    override async execFallback(
        prepRes: LLMToolsCallParam,
        _error: Error,
    ): Promise<void> {
        if (prepRes.mcps) {
            await Promise.allSettled(prepRes.mcps.map((it) => it.close()))
        }
    }
}

class StoreNode extends Node<AskShare> {
    override async prep(shared: AskShare): Promise<void> {
        const { chat, resultMessage } = shared
        if (!resultMessage) {
            return
        }
        chat.topic.message.save(resultMessage)
    }
}

const askFlow = async ({
    chat,
    client,
    userContent,
    mcps,
    generalSetting,
    outputHandler,
    customTools,
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
    customTools: CustomTool[]
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
    const tools = new ToolsNode(mcps, customTools)
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
