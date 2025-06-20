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
} from '../types/llm-types'
import type MCPClient from '../types/mcp-client'
import type {
    ChatConfig,
    IChatStore,
    MessageContent,
} from '../types/store-types'
import { isEmpty, println, uuid } from '../util/common-utils'
import { Display } from './display'
import { assistant, system, user } from './llm-utils'

export type AskShare = LLMParam & {
    topicId?: string
    config: ChatConfig
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
        const { sysPrompt } = shared.config
        if (isEmpty(sysPrompt)) {
            return
        }
        shared.messages.push(system(sysPrompt))
    }
}

class PresetNode extends Node<AskShare> {
    private readonly store: IChatStore
    constructor(store: IChatStore) {
        super()
        this.store = store
    }

    override async prep(shared: AskShare): Promise<void> {
        const presetMessage = this.store.selectPresetMessage().flatMap(
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
    private readonly store: IChatStore
    constructor(store: IChatStore) {
        super()
        this.store = store
    }

    override async prep(shared: AskShare): Promise<void> {
        const { userContent, config, messages } = shared
        const { withContext, chatId, contextLimit } = config
        const tp = this.store.selectedTopic(chatId)
        if (!tp || shared.newTopic) {
            shared.topicId = this.store.createTopic(chatId, userContent)
        } else {
            shared.topicId = tp.id
        }
        const context = withContext
            ? this.store
                  .contextMessage(shared.topicId, contextLimit)
                  .map((it) => {
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
        if (!shared.config.withMCP) {
            return
        }
        shared.mcps = this.mcps
        await Promise.all(this.mcps.map((it) => it.connect()))
        const tools = (
            await Promise.all(this.mcps.flatMap((it) => it.tools()))
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
            const runner = this.client.beta.chat.completions
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
                .on('tool_calls.function.arguments.done', (it) => {
                    const f = tools.find((i) => i.id == it.name)!
                    display.toolCall(
                        f?.mcpServer,
                        f?.mcpVersion,
                        f?.funName,
                        it.arguments
                    )
                })
                .on('functionCallResult', (it) => {
                    display.toolCallReult(it)
                })
                .on('content', (it) => {
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
    private readonly store: IChatStore

    constructor(store: IChatStore) {
        super()
        this.store = store
    }

    override async prep(shared: AskShare): Promise<void> {
        const { userContent, resultChunk, topicId } = shared
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
        this.store.saveMessage(messages)
    }
}

// system -> preset -> context -> user -> tools -> router -> streamCall / toolsCall -> store
async function askFlow({
    client,
    store,
    config,
    userContent,
    mcps,
    generalSetting,
    noStream = false,
    newTopic,
}: {
    client: OpenAI
    store: IChatStore
    config: ChatConfig
    userContent: string
    mcps: MCPClient[]
    generalSetting: GeneralSetting
    noStream?: boolean
    newTopic?: boolean
}) {
    const share: AskShare = {
        userContent,
        messages: [],
        model: config.model,
        temperature: config.scenario,
        config,
        generalSetting,
        theme: generalSetting.theme,
        noStream,
        newTopic,
    }

    const systemPrompt = new SystemPromptNode()
    const preset = new PresetNode(store)
    const context = new ContextNode(store)
    const userNode = new UserNode()
    const tools = new ToolsNode(mcps)
    const router = new AiRouterNode()

    const storeChat = new StoreNode(store)
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
