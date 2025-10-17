import { version } from '../../package.json'
import type { MCPConfig } from '../llm/mcp-client'
import { dataPath } from './data-config'

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

export const APP_VERSION = version

const defaultGeneralSetting: GeneralSetting = {
    theme: `Rose Pine`,
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

export const initAppSetting = async (): Promise<void> => {
    const f = Bun.file(dataPath.setting)
    const ext = await f.exists()
    if (ext) {
        return
    }
    const defSetting = {
        generalSetting: defaultGeneralSetting,
        llmSettings: defaultLLMSettings,
        mcpServers: [],
    }
    f.write(JSON.stringify(defSetting, null, 2))
}

export const appSetting = async (): Promise<Setting> => {
    const json = await Bun.file(dataPath.setting).text()
    return JSON.parse(json) as Setting
}

export const appSettingCover = async (json: string): Promise<void> => {
    await Bun.file(dataPath.setting).write(json)
}
