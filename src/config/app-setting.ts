import { version } from '../../package.json'
import type { MCPConfig } from '../llm/mcp-client'
import { dataPath } from './data-config'
import settingsSchemaContent from './ifcli-settings-schema.json'

// ── 精简后的功能配置类型 ──

export type GeneralSetting = {
    theme: string
}

export type AutoNameConfig = {
    enabled: boolean
    /** provider/modelId 格式，如 "openai/gpt-4o-mini" */
    model: string
}

export type SessionConfig = {
    autoName: AutoNameConfig
}

export type CompactionConfig = {
    enabled: boolean
    /** 当 estimatedTokens >= model.contextWindow * triggerRatio 时触发 */
    triggerRatio: number
    /** 保留最近 model.contextWindow * keepRecentRatio 的原文 */
    keepRecentRatio: number
}

/** 自定义工具：group 改为 tags（数组，支持多个标签） */
export type CustomToolDef = {
    def: {
        type: 'function'
        function: {
            name: string
            description: string
            parameters: Record<string, unknown>
        }
    }
    tags: string[]
    command: string[]
}

export type Setting = {
    generalSetting: GeneralSetting
    session: SessionConfig
    compaction: CompactionConfig
    mcpServers: MCPConfig[]
    customTools?: CustomToolDef[]
}

// ── 默认配置 ──

export const APP_VERSION = version

const defaultGeneralSetting: GeneralSetting = {
    theme: 'Tokyo Night',
}

const defaultSessionConfig: SessionConfig = {
    autoName: {
        enabled: true,
        model: 'openai/gpt-4o-mini',
    },
}

const defaultCompaction: CompactionConfig = {
    enabled: true,
    triggerRatio: 0.8,
    keepRecentRatio: 0.3,
}

// ── 初始化 & 读写 ──

export const initAppSetting = async (): Promise<void> => {
    const f = Bun.file(dataPath.setting)
    const exists = await f.exists()
    if (!exists) {
        const defSetting = {
            $schema: './ifcli-settings-schema.json',
            generalSetting: defaultGeneralSetting,
            session: defaultSessionConfig,
            compaction: defaultCompaction,
            mcpServers: [],
            customTools: [],
        }
        await f.write(JSON.stringify(defSetting, null, 2))
    }
    // 写 schema 文件（供 IDE 补全）
    const sf = Bun.file(dataPath.schema)
    if (!(await sf.exists())) {
        await sf.write(JSON.stringify(settingsSchemaContent, null, 2))
    }
}

export const appSetting = async (): Promise<Setting> => {
    const json = await Bun.file(dataPath.setting).text()
    return JSON.parse(json) as Setting
}

export const appSettingCover = async (json: string): Promise<void> => {
    await Bun.file(dataPath.setting).write(json)
}

export const customTools = async (): Promise<CustomToolDef[]> => {
    const f = Bun.file(dataPath.customTools)
    if (!(await f.exists())) {
        return []
    }
    const toolsdef = await f.text()
    const parsed = JSON.parse(toolsdef)
    return ((parsed as { tools: CustomToolDef[] }).tools ?? parsed) as CustomToolDef[]
}
