import type { MCPConfig } from '../types/mcp-client'
import type { AppSetting, AppSettingContent } from '../types/store-types'
import { error, isEmpty } from '../util/common-utils'
import { promptMessage } from './prompt-message'

export type LLMSetting = {
    name: string
    baseUrl: string
    apiKey: string
    models: string[]
}

export type GeneralSetting = {
    theme: string 
}

export type Setting = {
    generalSetting: GeneralSetting
    mcpServers: MCPConfig[]
    llmSettings: LLMSetting[]
}

export const version = '0.1.13'

const defaultGeneralSetting: GeneralSetting = {
    theme: `violet_tides`,
}

export const defaultLLMSettings: LLMSetting[] = [
    {
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: '',
        models: ['deepseek-chat', 'deepseek-reasoner'],
    },
    {
        name: 'ollama',
        baseUrl: 'http://localhost:11434/v1/',
        apiKey: '',
        models: [],
    },
    {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        models: ['gpt-4o'],
    },
]

export const defaultSetting: AppSettingContent = {
    version,
    generalSetting: JSON.stringify(defaultGeneralSetting),
    mcpServer: '[]',
    llmSetting: '[]',
}

export class AppSettingParse {
    private readonly appSetting: AppSetting
    constructor(appSetting: AppSetting) {
        this.appSetting = appSetting
    }

    setting = (withoutDefault: boolean = false): Setting => {
        return {
            generalSetting: this.generalSetting(),
            mcpServers: this.mcpServers(),
            llmSettings: this.llmSettings(withoutDefault),
        }
    }

    editShow = (): string => {
        return JSON.stringify(this.setting(), null, 2)
    }

    generalSetting = (): GeneralSetting => {
        const st = this.appSetting.generalSetting
        if (isEmpty(st)) {
            return defaultGeneralSetting
        }
        return JSON.parse(st) as GeneralSetting
    }

    mcpServers = (): MCPConfig[] => {
        const mcpServerJson = this.appSetting.mcpServer
        if (isEmpty(mcpServerJson)) {
            return []
        }
        return JSON.parse(mcpServerJson) as MCPConfig[]
    }

    llmSettings = (withoutDefault: boolean = false): LLMSetting[] => {
        const llmSettingJosn = this.appSetting.llmSetting
        if (isEmpty(llmSettingJosn)) {
            return defaultLLMSettings
        }
        const settings = JSON.parse(llmSettingJosn!) as LLMSetting[]
        if (withoutDefault) {
            return settings
        }
        return defaultLLMSettings.reduce((arr, df) => {
            const ex = arr.find((it) => it.name === df.name)
            if (ex) {
                return arr
            }
            arr.push(df)
            return arr
        }, settings)
    }

    editParse = (str: string): AppSettingContent | undefined => {
        try {
            const { generalSetting, mcpServers, llmSettings } = JSON.parse(
                str
            ) as Setting
            return {
                version,
                generalSetting: this.generalSettingParse(generalSetting),
                mcpServer: this.mcpServerParse(mcpServers),
                llmSetting: this.llmSettingParse(llmSettings),
            } as AppSettingContent
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
            error(promptMessage.cfParseErr)
            return
        }
    }

    generalSettingParse = (generalSetting: GeneralSetting): string => {
        if (!generalSetting) {
            return JSON.stringify(defaultGeneralSetting)
        }
        return JSON.stringify(generalSetting)
    }

    mcpServerParse = (mcpServers: MCPConfig[]): string => {
        if (!mcpServers) {
            return JSON.stringify([])
        }
        return JSON.stringify(mcpServers)
    }

    llmSettingParse = (llmSettings: LLMSetting[]): string => {
        return JSON.stringify(
            llmSettings.filter((it) => {
                if (it.name === 'deepseek') {
                    return !isEmpty(it.apiKey)
                }
                if (it.name === 'ollama') {
                    return !isEmpty(it.models)
                }
                if (it.name === 'openai') {
                    return !isEmpty(it.apiKey)
                }
                return true
            })
        )
    }
}
