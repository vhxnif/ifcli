import OpenAi from 'openai'
import type { IConfig } from '../types/config-types'
import type { ILLMClient, LLMMessage, LLMRole } from '../types/llm-types'

export class OpenAiClient implements ILLMClient {

    client: OpenAi
    private config: IConfig
    constructor(config: IConfig) {
        this.config = config 
        this.client = new OpenAi({
            baseURL: config.baseURL,
            apiKey: config.apiKey,
        })
    }
    coderModel = () => this.config.coderModel
    chatModel = () => this.config.commonModel
    models = () => this.config.models

    user = (content: string): LLMMessage => this.message('user', content)

    system = (content: string): LLMMessage => this.message('system', content)

    assistant = (content: string): LLMMessage => this.message('assistant', content)

    call = async (messages: LLMMessage[], model: string, temperature: number, f: (res: string) => void) => {
        await this.client.chat.completions.create({
            messages: messages,
            model: model,
            temperature,
        })
            .then(it => f(it.choices[0]?.message?.content ?? ''))
            .catch(err => console.error(err))
    }
    stream = async (messages: LLMMessage[], model: string, temperature: number, f: (res: string) => void) => {
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

    private message = (role: LLMRole, content: string): LLMMessage => ({ role, content })

}