/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAi from 'openai'
import type { RunnableToolFunction } from 'openai/lib/RunnableFunction'
import type { LLMSetting } from '../config/app-setting'
import type {
    ILLMClient,
    LLMCallParam,
    LLMStreamMCPParam,
    LLMStreamParam,
} from '../types/llm-types'
import MCPClient from '../types/mcp-client'
import { llmNotifyMessage } from './llm-utils'
import { StreamDisplay } from './stream-display'

export class OpenAiClient implements ILLMClient {
    client: OpenAi
    type: string
    models: string[]
    defaultModel: string 

    constructor(
        { baseUrl, apiKey, models, name }: LLMSetting
    ) {
        this.type = name
        this.models = models
        this.defaultModel = models[0]
        this.client = new OpenAi({
            baseURL: baseUrl,
            apiKey: apiKey,
        })
    }


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
        const {
            userMessage,
            messages,
            model,
            interactiveOutput,
            temperature,
            messageStore,
        } = param
        const display = new StreamDisplay({
            interactiveOutput,
            userMessage,
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
            console.log(e)
            display.error()
        }
    }

    callWithTools = async (param: LLMStreamMCPParam) => {
        const {
            userMessage,
            messages,
            model,
            interactiveOutput,
            temperature,
            messageStore,
            mcpClients,
        } = param
        // support tools mcp server now
        const display = new StreamDisplay({
            interactiveOutput,
            userMessage,
            messageStore,
        })
        try {
            await Promise.all(mcpClients.map((it) => it.connect()))
            const tools = (
                await Promise.all(
                    mcpClients.flatMap((it) => this.mapToTools(it))
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
            await Promise.all(mcpClients.map((it) => it.close()))
            console.log(err)
            display.error()
        }
        await Promise.all(mcpClients.map((it) => it.close()))
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
                    } as RunnableToolFunction<any>)
            )
        )
}
