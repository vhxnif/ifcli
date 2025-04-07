/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAi from 'openai'
import type { RunnableToolFunction } from 'openai/lib/RunnableFunction'
import type {
    ILLMClient,
    LLMCallParam,
    LLMMessage,
    LLMRole,
    LLMStreamMCPParam,
    LLMStreamParam,
} from '../types/llm-types'
import MCPClient from '../types/mcp-client'
import { llmNotifyMessage } from './llm-utils'
import { StreamDisplay } from './stream-display'
import type { LLMSetting } from '../config/app-setting'

export class OpenAiClient implements ILLMClient {
    client: OpenAi
    type: string
    private config: LLMSetting
    private mcps: MCPClient[]
    constructor({
        llmConfig,
        mcpClients,
    }: {
        llmConfig: LLMSetting
        mcpClients: MCPClient[]
    }) {
        this.config = llmConfig
        this.type = this.config.name
        this.client = new OpenAi({
            baseURL: this.config.baseUrl,
            apiKey: this.config.apiKey,
        })
        this.mcps = mcpClients
    }

    mcpClients = () => this.mcps

    defaultModel = () => this.config.models[0]

    models = () => this.config.models

    user = (content: string): LLMMessage => this.message('user', content)

    system = (content: string): LLMMessage => this.message('system', content)

    assistant = (content: string): LLMMessage =>
        this.message('assistant', content)

    call = async (param: LLMCallParam) => {
        const { messages, model, temperature, contentConsumer } = param
        await this.client.chat.completions
            .create({
                messages,
                model,
                temperature,
            })
            .then((it) =>
                contentConsumer(it.choices[0]?.message?.content ?? '')
            )
            .catch((err) => console.error(err))
    }

    stream = async (param: LLMStreamParam) => {
        const { messages, model, temperature, messageStore } = param
        const display = new StreamDisplay({
            userMessage: this.userMessage(messages),
            messageStore,
        })
        try {
            const stream = await this.client.chat.completions.create({
                model,
                messages,
                temperature,
                stream: true,
            })
            for await (const chunk of stream) {
                display.thinkingShow(chunk)
            }
            await display.pageShow()
        } catch (e: unknown) {
            console.error(e)
            display.error()
        }
    }

    callWithTools = async (param: LLMStreamMCPParam) => {
        const { messages, model, temperature, messageStore, mcpClients } = param
        // support tools mcp server now
        const actMcpClients = mcpClients!.filter((it) =>
            it.type.includes('tools')
        )
        const display = new StreamDisplay({
            userMessage: this.userMessage(messages),
            messageStore,
        })
        try {
            await Promise.all(actMcpClients.map((it) => it.connect()))
            // map to openai tools
            const tools = (
                await Promise.all(
                    actMcpClients.flatMap((it) => this.mapToTools(it))
                )
            ).flat()
            // call llm
            const runner = this.client.beta.chat.completions
                .runTools({
                    model,
                    temperature,
                    stream: true,
                    tools,
                    messages,
                })
                .on('functionCall', () => {
                    display.change(llmNotifyMessage.analyzing)
                })
                .on('functionCallResult', () => {
                    display.change(llmNotifyMessage.thinking)
                })
                .on('content', (it) => {
                    display.contentShow(it)
                })
            await runner.finalChatCompletion()
            await display.pageShow()
        } catch (err: unknown) {
            await Promise.all(actMcpClients.map((it) => it.close()))
            display.error()
        }
        await Promise.all(actMcpClients.map((it) => it.close()))
    }

    private mapToTools = async (mcp: MCPClient) =>
        await mcp.listTools().then((res) =>
            res.tools.map(
                (t) =>
                    ({
                        type: 'function',
                        function: {
                            name: t.name,
                            description: t.description,
                            parameters: {
                                ...t.inputSchema,
                            },
                            function: async (args: any) =>
                                await mcp.callTool(t.name, args),
                            parse: JSON.parse,
                        },
                    }) as RunnableToolFunction<any>
            )
        )

    private message = (role: LLMRole, content: string): LLMMessage => ({
        role,
        content,
    })

    private userMessage = (messages: LLMMessage[]) => {
        return messages[messages.length - 1]
    }
}
