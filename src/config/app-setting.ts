import type { MCPConfig } from '../types/mcp-client'
import type { AppSetting, AppSettingContent } from '../types/store-types'
import { error, isEmpty } from '../util/common-utils'

export type LLMSetting = {
    name: string
    baseUrl: string
    apiKey: string
    models: string[]
}

export type Setting = {
    mcpServers: MCPConfig[] 
    llmSettings: LLMSetting[]
}

export const version = '0.1.8'

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
            mcpServers: this.mcpServers(),
            llmSettings: this.llmSettings(withoutDefault),
        }
    }

    editShow = (): string => {
        return JSON.stringify(this.setting(), null, 2)
    }

    private mcpServers = (): MCPConfig[] => {
        const mcpServerJson = this.appSetting.mcpServer
        if (isEmpty(mcpServerJson)) {
            return []
        }
        return JSON.parse(mcpServerJson) as MCPConfig[]
    }

    private llmSettings = (withoutDefault: boolean = false): LLMSetting[] => {
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
            const st = JSON.parse(str) as Setting
            return {
                version: this.appSetting.version,
                mcpServer: this.mcpServerParse(st),
                llmSetting: this.llmSettingParse(st),
            } as AppSettingContent
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
            error('Setting Format Error.')
            return
        }
    }

    private mcpServerParse = (st: Setting): string => {
        if (!st.mcpServers) {
            return JSON.stringify([])
        }
        return JSON.stringify(st.mcpServers)
    }

    private llmSettingParse = (st: Setting): string => {
        return JSON.stringify(
            st.llmSettings.filter((it) => {
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
