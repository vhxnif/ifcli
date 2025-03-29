import { isEmpty } from 'lodash'
import { env } from '../util/platform-utils'

export type LLMType = 'deepseek' | 'ollama' | 'openai'

export interface ILLMConfig {
    type: LLMType
    baseUrl: string
    apiKey: string
    models: string[]
    defaultModel: string
    isSet: () => boolean
}

export abstract class AbstractLLMConfig implements ILLMConfig {
    public readonly type: LLMType
    public readonly baseUrl: string
    public readonly apiKey: string
    public readonly models: string[]
    public readonly defaultModel: string

    constructor({
        type,
        defaultBaseUrl,
        defaultModels,
    }: {
        type: LLMType
        defaultBaseUrl: string
        defaultModels: string[]
    }) {
        const v = (key: string) => env(`IFCLI_${type.toUpperCase()}_${key}`)
        this.type = type
        this.baseUrl = v('BASE_URL') ?? defaultBaseUrl
        this.apiKey = v('API_KEY') ?? ''
        this.models = [
            ...defaultModels,
            ...(v('MODELS')
                ?.split(',')
                .map((it) => it.trim()) ?? []),
        ]
        this.defaultModel = isEmpty(this.models) ? '' : this.models[0]
    }

    abstract isSet: () => boolean
}

export class DeepseekConfig extends AbstractLLMConfig {
    constructor() {
        super({
            type: 'deepseek',
            defaultBaseUrl: 'https://api.deepseek.com',
            defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
        })
    }
    isSet = () => !isEmpty(this.apiKey)
}

export class OllamaConfig extends AbstractLLMConfig {
    constructor() {
        super({
            type: 'ollama',
            defaultBaseUrl: 'http://localhost:11434/v1/',
            defaultModels: [],
        })
    }
    isSet = () => !isEmpty(this.models)
}

export class OpenAIConfig extends AbstractLLMConfig {
    constructor() {
        super({
            type: 'openai',
            defaultBaseUrl: 'https://api.openai.com/v1',
            defaultModels: ['gpt-4o'],
        })
    }
    isSet = () => !isEmpty(this.apiKey)
}
