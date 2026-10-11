/**
 * [INPUT]: 依赖 ./data-config 的 dataPath，依赖 ./settings-schema.json 的 schema 内容，
 *          依赖 ../llm/mcp-client 的 MCPConfig
 * [OUTPUT]: Setting / CustomToolDef / CustomProviderDef / CustomProviderApi / CustomProviderModel 类型，initAppSetting / appSetting / appSettingCover 读写函数
 * [POS]: src/config/ 的配置读写核心，被 ../app-context 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { version } from '../../package.json'
import type { OpenAICompletionsCompat, ThinkingLevelMap } from '../llm/base'
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

/** 自定义 provider 可复用的 pi-ai 协议实现 */
export type CustomProviderApi =
    | 'anthropic-messages'
    | 'azure-openai-responses'
    | 'bedrock-converse-stream'
    | 'google-generative-ai'
    | 'google-vertex'
    | 'mistral-conversations'
    | 'openai-codex-responses'
    | 'openai-completions'
    | 'openai-responses'
    | 'pi-messages'

/** 自定义 provider 暴露的模型声明，缺省字段由注册器补默认值 */
export type CustomProviderModel = {
    id: string
    name?: string
    contextWindow?: number
    maxTokens?: number
    reasoning?: boolean
    input?: ('text' | 'image')[]
    /** 思考等级 → provider 专有值映射；null 表示该等级不支持 */
    thinkingLevelMap?: ThinkingLevelMap
    /** OpenAI 兼容协议高级开关，如 { thinkingFormat: "deepseek" } 使 off 时下发 thinking:{type:"disabled"} */
    compat?: OpenAICompletionsCompat
}

/** 自定义 provider：复用 pi-ai 协议实现对接任意兼容网关 */
export type CustomProviderDef = {
    id: string
    name?: string
    baseUrl: string
    api: CustomProviderApi
    /** 依次尝试的环境变量名，用于解析 API key */
    apiKeyEnv: string[]
    headers?: Record<string, string>
    models: CustomProviderModel[]
}

export type Setting = {
    generalSetting: GeneralSetting
    session: SessionConfig
    compaction: CompactionConfig
    mcpServers: MCPConfig[]
    customTools?: CustomToolDef[]
    providers?: CustomProviderDef[]
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
    providers: [],
}

const mergeWithDefaults = (partial: Partial<Setting>): Setting => ({
    generalSetting: partial.generalSetting ?? defaultGeneralSetting,
    session: partial.session ?? defaultSessionConfig,
    compaction: partial.compaction ?? defaultCompaction,
    mcpServers: partial.mcpServers ?? [],
    customTools: partial.customTools ?? [],
    providers: partial.providers ?? [],
})

// ── 初始化 & 读写 ──

export const initAppSetting = async (): Promise<void> => {
    const settingsFile = Bun.file(dataPath.settings)
    const settingsExists = await settingsFile.exists()

    const setting = settingsExists
        ? mergeWithDefaults(
              JSON.parse(await settingsFile.text()) as Partial<Setting>,
          )
        : { ...defaultSetting }

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
}

export const appSetting = async (): Promise<Setting> => {
    const json = await Bun.file(dataPath.settings).text()
    return JSON.parse(json) as Setting
}

export const appSettingCover = async (json: string): Promise<void> => {
    await Bun.file(dataPath.settings).write(json)
}
