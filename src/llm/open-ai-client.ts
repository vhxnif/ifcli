/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAi from 'openai'
import type { IConfig } from '../types/config-types'
import type {
    ILLMClient,
    LLMCallParam,
    LLMMessage,
    LLMRole,
} from '../types/llm-types'
import type { MCPConfig } from '../types/mcp_client'
import type { RunnableToolFunction } from 'openai/lib/RunnableFunction'
import ora from 'ora'
import { accessSync, constants, readFileSync } from 'node:fs'
import MCPClient from '../types/mcp_client'

export class OpenAiClient implements ILLMClient {
    client: OpenAi
    private config: IConfig
    constructor(config: IConfig) {
        this.config = config
        this.client = new OpenAi({
            baseURL: config.baseURL(),
            apiKey: config.apiKey(),
        })
    }

    tools = (): MCPClient[] => {
        const mcpConfig = this.config.mcpConfigPath()
        if (!mcpConfig) {
            return [] as MCPClient[]
        }
        try {
            accessSync(mcpConfig, constants.F_OK)
            const data = readFileSync(mcpConfig, 'utf8')
            const mcpConfigs = JSON.parse(data) as MCPConfig[]
            return mcpConfigs
                .map((it) => new MCPClient(it))
                .filter((it) => it.type.includes('tools'))
        } catch (err: any) {
            return [] as MCPClient[]
        }
    }
    defaultModel = () => this.config.defaultModel()

    models = () => this.config.models()

    user = (content: string): LLMMessage => this.message('user', content)

    system = (content: string): LLMMessage => this.message('system', content)

    assistant = (content: string): LLMMessage =>
        this.message('assistant', content)

    call = async (param: LLMCallParam) => {
        const { messages, model, temperature, f } = param
        await this.client.chat.completions
            .create({
                messages: messages,
                model: model,
                temperature,
            })
            .then((it) => f(it.choices[0]?.message?.content ?? ''))
            .catch((err) => console.error(err))
    }
    stream = async (param: LLMCallParam) => {
        const { messages, model, temperature, f } = param
        const stream = await this.client.chat.completions.create({
            model: model,
            messages: messages,
            temperature,
            stream: true,
        })
        for await (const part of stream) {
            f(part.choices[0]?.delta?.content || '')
        }
    }

    callWithTools = async (param: LLMCallParam) => {
        const { messages, model, temperature, f, mcpClients } = param
        try {
            await Promise.all(mcpClients!.map((it) => it.connect()))
            const sp = ora('thinking...').start()
            const tools = (
                await Promise.all(mcpClients!.flatMap(this.mapToOpenAiTools))
            ).flat()
            let isStop = false
            const runner = this.client.beta.chat.completions
                .runTools({
                    stream: true,
                    model,
                    temperature,
                    tools,
                    messages,
                })
                .on('functionCall', (functionCall) => {
                    sp.text = `call ${functionCall.name} args: ${functionCall.arguments}`
                })
                .on('functionCallResult', (it) => {
                    sp.text = `call result: ${it}`
                })
                .on('content', (it) => {
                    if (!isStop) {
                        sp.stop()
                        isStop = true
                    }
                    f(it)
                })
            await runner.finalFunctionCallResult()
            await Promise.all(mcpClients!.map((it) => it.close()))
        } catch (err: unknown) {
            console.log('err: ', err)
            await Promise.all(mcpClients!.map((it) => it.close()))
        }
    }

    private mapToOpenAiTools = async (mcp: MCPClient) =>
        (await mcp.listTools()).tools.map(
            (t) =>
                ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: { ...t.inputSchema },
                        function: async (args: any) =>
                            await mcp.callTool(t.name, args),
                        parse: JSON.parse,
                    },
                }) as RunnableToolFunction<any>
        )

    private message = (role: LLMRole, content: string): LLMMessage => ({
        role,
        content,
    })
}
