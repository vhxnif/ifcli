import OpenAi from 'openai'
import type { LLMSetting } from '../config/app-setting'
import type { ILLMClient } from './llm-types'

export class OpenAiClient implements ILLMClient {
    openai: OpenAi
    type: string
    models: string[]
    defaultModel: string

    constructor({ baseUrl, apiKey, models, name }: LLMSetting) {
        this.type = name
        this.models = models
        this.defaultModel = models[0]
        this.openai = new OpenAi({
            baseURL: baseUrl,
            apiKey: apiKey,
        })
    }
}
