/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type { RunnableToolFunctionWithoutParse } from 'openai/lib/RunnableFunction.mjs'
import { Flow, Node } from 'pocketflow'
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
import { isEmpty, uuid } from '../util/common-utils'
import { Display } from './display'
import { assistant, llmNotifyMessage, system, user } from './llm-utils'

export type AskShare = LLMParam & {
    config: ChatConfig
    resultChunk?: LLMResultChunk
    tools?: { id: string; name: string; f: RunnableToolFunctionWithoutParse }[]
    mcps?: MCPClient[]
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
        const { withContext } = shared.config
        const context = withContext
            ? this.store.contextMessage().map((it) => {
                  if (it.role === 'user') {
                      return user(it.content)
                  }
                  return assistant(it.content)
              })
            : []
        shared.messages = [...shared.messages, ...context]
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
        const { mcps, tools, messages, model, temperature } = shared
        return {
            mcps,
            tools,
            messages,
            model,
            temperature,
        } as LLMToolsCallParam
    }

    override async exec(prepRes: LLMToolsCallParam): Promise<LLMResultChunk> {
        const display = new Display()
        const { model, temperature, tools, messages } = prepRes
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
                    display.change(llmNotifyMessage.analyzing)
                })
                .on('tool_calls.function.arguments.done', (it) => {
                    display.toolCall(
                        tools.find((i) => i.id == it.name)?.name ?? it.name,
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
            return display.stop().result()
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
        const display = new Display()
        try {
            const stream = await this.client.chat.completions.create({
                ...prepRes,
                stream: true,
            })
            for await (const chunk of stream) {
                display.thinkingShow(chunk)
            }
            return display.stop().result()
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
        const { config, userContent, resultChunk } = shared
        if (!resultChunk) {
            return
        }
        const { chatId } = config
        const { tools, assistant, reasoning } = resultChunk
        const pairKey = uuid()
        const messages: MessageContent[] = [
            { chatId, role: 'user', content: userContent, pairKey },
            { chatId, role: 'assistant', content: assistant.join(''), pairKey },
        ]
        if (!isEmpty(tools) || !isEmpty(reasoning)) {
            const thinkingReasoning = `${reasoning.join('')}\n\n${tools.join(
                ''
            )}`
            messages.push({
                chatId,
                role: 'reasoning',
                content: thinkingReasoning,
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
}: {
    client: OpenAI
    store: IChatStore
    config: ChatConfig
    userContent: string
    mcps: MCPClient[]
}) {
    const share: AskShare = {
        userContent,
        messages: [],
        model: config.model,
        temperature: config.scenario,
        config,
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
