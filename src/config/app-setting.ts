/**
 * [INPUT]: 依赖 ./data-config 的 dataPath，依赖 ./settings-schema.json 的 schema 内容，
 *          依赖 ../llm/mcp-client 的 MCPConfig，依赖 node:fs/promises 的 unlink
 * [OUTPUT]: Setting / CustomToolDef 类型，initAppSetting / appSetting / appSettingCover 读写函数
 * [POS]: src/config/ 的配置读写核心，被 ../app-context 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { unlink } from 'node:fs/promises'
import { version } from '../../package.json'
import type { MCPConfig } from '../llm/mcp-client'
import { dataPath } from './data-config'
import settingsSchemaContent from './settings-schema.json'

// ── 精简后的功能配置类型 ──

export type GeneralSetting = {
    theme: string
    /** 工具数量超过此阈值时使用发现工具，否则直接注入原始 tool schema */
    toolDiscoveryThreshold: number
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
    toolDiscoveryThreshold: 8,
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

const defaultSetting: Setting = {
    generalSetting: defaultGeneralSetting,
    session: defaultSessionConfig,
    compaction: defaultCompaction,
    mcpServers: [],
    customTools: [],
}

type LegacyCustomToolDef = CustomToolDef & { group?: string }

const migrateCustomTools = (tools?: CustomToolDef[]): CustomToolDef[] => {
    if (!tools) return []
    return tools.map((ct) => {
        const legacy = ct as LegacyCustomToolDef
        const { group, ...rest } = legacy
        if (group && (!rest.tags || rest.tags.length === 0)) {
            return { ...rest, tags: [group] }
        }
        return rest as CustomToolDef
    })
}

const mergeWithDefaults = (partial: Partial<Setting>): Setting => ({
    generalSetting: partial.generalSetting ?? defaultGeneralSetting,
    session: partial.session ?? defaultSessionConfig,
    compaction: partial.compaction ?? defaultCompaction,
    mcpServers: partial.mcpServers ?? [],
    customTools: migrateCustomTools(partial.customTools),
})

// ── 初始化 & 读写 ──

export const initAppSetting = async (): Promise<void> => {
    const settingsFile = Bun.file(dataPath.settings)
    const settingsExists = await settingsFile.exists()

    let setting: Setting

    if (!settingsExists) {
        const legacyFile = Bun.file(dataPath.legacySettings)
        if (await legacyFile.exists()) {
            // 迁移旧配置文件
            const legacyJson = await legacyFile.text()
            setting = mergeWithDefaults(
                JSON.parse(legacyJson) as Partial<Setting>,
            )
            await unlink(dataPath.legacySettings)
        } else {
            setting = { ...defaultSetting }
        }
    } else {
        const json = await settingsFile.text()
        setting = mergeWithDefaults(JSON.parse(json) as Partial<Setting>)
    }

    // 迁移旧独立 customTools 文件到 settings.json
    const legacyCustomToolsFile = Bun.file(dataPath.legacyCustomTools)
    if (await legacyCustomToolsFile.exists()) {
        try {
            const toolsJson = await legacyCustomToolsFile.text()
            const parsed = JSON.parse(toolsJson)
            const legacyTools = ((parsed as { tools: CustomToolDef[] }).tools ??
                parsed) as CustomToolDef[]
            if (legacyTools.length > 0) {
                setting.customTools = [
                    ...(setting.customTools ?? []),
                    ...legacyTools,
                ]
            }
        } catch {
            // 旧文件损坏，忽略
        }
        await unlink(dataPath.legacyCustomTools)
    }

    // 写 settings.json（确保 schema 引用正确）
    const toWrite = {
        ...setting,
        $schema: './settings-schema.json',
    }
    await Bun.write(dataPath.settings, JSON.stringify(toWrite, null, 2))

    // 写 schema 文件（供 IDE 补全）
    await Bun.write(
        dataPath.settingsSchema,
        JSON.stringify(settingsSchemaContent, null, 2),
    )

    // 删除旧 schema 文件
    const legacySchemaFile = Bun.file(dataPath.legacySettingsSchema)
    if (await legacySchemaFile.exists()) {
        await unlink(dataPath.legacySettingsSchema)
    }
}

export const appSetting = async (): Promise<Setting> => {
    const json = await Bun.file(dataPath.settings).text()
    return JSON.parse(json) as Setting
}

export const appSettingCover = async (json: string): Promise<void> => {
    await Bun.file(dataPath.settings).write(json)
}
