/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type { RunnableToolFunctionWithoutParse } from 'openai/lib/RunnableFunction.mjs'
import { Flow, Node } from 'pocketflow'
import type { GeneralSetting } from '../config/app-setting'
import type {
    LLMMessage,
    LLMParam,
    LLMResultChunk,
    LLMToolsCallParam,
} from './llm-types'
import type MCPClient from './mcp-client'
import type { ChatInfo, MessageContent } from '../store/store-types'
import { isEmpty, println, uuid } from '../util/common-utils'
import { Display } from '../component/llm-result-show'
import { assistant, system, user } from './llm-utils'

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
}

class SystemPromptNode extends Node<AskShare> {
    constructor() {
        super()
    }

    override async prep(shared: AskShare): Promise<void> {
        const { systemPrompt } = shared
        if (isEmpty(systemPrompt)) {
            return
        }
        shared.messages.push(system(systemPrompt))
    }
}

class PresetNode extends Node<AskShare> {
    constructor() {
        super()
    }

    override async prep(shared: AskShare): Promise<void> {
        const { chat } = shared
        const presetMessage = chat.preset.get().flatMap(
            (it) =>
                [
                    { role: 'user', content: it.user },
                    { role: 'assistant', content: it.assistant },
                ] as LLMMessage[]
        )
        shared.messages = [...shared.messages, ...presetMessage]
    }
}

class ContextNode extends Node<AskShare> {
    constructor() {
        super()
    }

    override async prep(shared: AskShare): Promise<void> {
        const { chat, userContent, messages, withContext, contextLimit } =
            shared
        const tpfun = chat.topic
        const tp = tpfun.get()
        if (!tp || shared.newTopic) {
            shared.topicId = tpfun.new(userContent)
        } else {
            shared.topicId = tp.id
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
    constructor() {
        super()
    }

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
                (it) => it.name === m.name && it.version === m.version
            )
            return one !== void 0
        }
        const mcps = this.mcps.filter(filterActiveMCPServer)
        if (isEmpty(mcps)) {
            return
        }
        shared.mcps = mcps
        const tools = (
            await Promise.all(
                mcps.flatMap(async (it) => {
                    await it.connect()
                    return await it.tools()
                })
            )
        ).flat()
        shared.tools = tools
    }

    override async execFallback(prepRes: unknown, error: Error): Promise<void> {
        if (this.mcps) {
            await Promise.all(this.mcps.map((it) => it.close()))
        }
        throw error
    }
}

class AiRouterNode extends Node<AskShare> {
    override async post(
        shared: AskShare,
        prepRes: unknown,
        execRes: unknown
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
        const { model, temperature, tools, messages, theme, noStream } = prepRes
        const render = !noStream
        const display = new Display({
            theme,
            textShowRender: render,
            enableSpinner: render,
        })
        try {
            const runner = this.client.chat.completions
                .runTools({
                    model,
                    temperature,
                    tools: tools.map((it) => it.f),
                    messages,
                    stream: true,
                })
                .on('tool_calls.function.arguments.delta', () => {
                    display.change('analyzing')
                })
                .on(
                    'tool_calls.function.arguments.done',
                    (it: { name: string; arguments: string }) => {
                        const f = tools.find((i) => i.id == it.name)!
                        display.toolCall(
                            f?.mcpServer,
                            f?.mcpVersion,
                            f?.funName,
                            it.arguments
                        )
                    }
                )
                .on('functionToolCallResult', (it: string) => {
                    display.toolCallReult(it)
                })
                .on('content', (it: string) => {
                    display.contentShow(it)
                })
            await runner.finalChatCompletion()
            const res = display.contentStop().result()
            if (noStream) {
                println(res.assistant.join(''))
            }
            return res
        } catch (err: unknown) {
            display.error()
            throw err
        }
    }

    override async post(
        shared: AskShare,
        prepRes: LLMToolsCallParam,
        execRes: LLMResultChunk
    ): Promise<string | undefined> {
        shared.resultChunk = execRes
        await Promise.all(prepRes.mcps.map((it) => it.close()))
        return undefined
    }

    override async execFallback(
        prepRes: LLMToolsCallParam,
        error: Error
    ): Promise<void> {
        await Promise.all(prepRes.mcps.map((it) => it.close()))
        throw error
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
        const { messages, model, temperature, theme, noStream } = prepRes
        const render = !noStream
        const display = new Display({
            theme,
            textShowRender: render,
            enableSpinner: render,
        })
        try {
            const stream = await this.client.chat.completions.create({
                messages,
                model,
                temperature,
                stream: true,
            })
            for await (const chunk of stream) {
                display.thinkingShow(chunk)
            }
            const res = display.contentStop().result()
            if (noStream) {
                println(res.assistant.join(''))
            }
            return res
        } catch (e: unknown) {
            display.error()
            throw e
        }
    }

    override async post(
        shared: AskShare,
        prepRes: LLMParam,
        execRes: LLMResultChunk
    ): Promise<string | undefined> {
        shared.resultChunk = execRes
        return undefined
    }
}

class StoreNode extends Node<AskShare> {
    constructor() {
        super()
    }

    override async prep(shared: AskShare): Promise<void> {
        const { chat, userContent, resultChunk, topicId } = shared
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
    }
}

// system prompt -> preset message -> context message -> user content -> tools -> router -> streamCall / toolsCall -> store
const askFlow = async ({
    chat,
    client,
    userContent,
    mcps,
    generalSetting,
    noStream = false,
    newTopic,
}: {
    chat: ChatInfo
    client: OpenAI
    userContent: string
    mcps: MCPClient[]
    generalSetting: GeneralSetting
    noStream?: boolean
    newTopic?: boolean
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
    }

    const systemPrompt = new SystemPromptNode()
    const preset = new PresetNode()
    const context = new ContextNode()
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
