/**
 * [INPUT]: 依赖 ./config/app-setting 的 initAppSetting/appSetting，依赖 @earendil-works/pi-ai/providers/all 的 builtinModels，
 *          依赖 ./store/session-manager 的 SessionManager，依赖 ./llm/tool-registry 的 ToolRegistry，依赖 ./component/theme/color-scheme 的主题
 * [OUTPUT]: 组装后的 chatService / terminalColor / theme / db / models / availableModels 等全局实例
 * [POS]: src/ 的应用组装入口，被 chat-command.ts / setting-command.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import Database from 'bun:sqlite'
import type { Models } from '@earendil-works/pi-ai'
import { builtinModels } from '@earendil-works/pi-ai/providers/all'
import { ChatService } from './action/chat-service'
import {
    chalkColor,
    getSemanticColors,
    getSpinnerName,
} from './component/theme/color-scheme'
import type {
    SpinnerName,
    ThemeSemanticColors,
} from './component/theme/theme-type'
import { appSetting, initAppSetting } from './config/app-setting'
import { dataPath } from './config/data-config'
import MCPClient from './llm/mcp-client'
import { DEFAULT_PI_COLORS } from './llm/pi-display-handler'
import { ToolRegistry } from './llm/tool-registry'
import { SessionManager } from './store/session-manager'

// ── 初始化 ──

await initAppSetting()
const setting = await appSetting()

// Pi 模型发现
const models: Models = builtinModels()
await models.refresh({ allowNetwork: true }).catch(() => {
    // 网络刷新失败不影响静态模型列表
})
const availableModels = await models.getAvailable().catch(() => [])

// 数据库
const db = new Database(dataPath.database, { strict: true })

// MCP 客户端
const mcps: MCPClient[] = (setting.mcpServers ?? [])
    .filter((s) => s.enable)
    .map((s) => {
        try {
            return new MCPClient(s)
        } catch {
            return null
        }
    })
    .filter((m): m is MCPClient => m !== null)

// 核心服务
const sessionManager = new SessionManager(db)
const toolRegistry = new ToolRegistry({
    mcps,
    customTools: setting.customTools ?? [],
    toolDiscoveryThreshold: setting.generalSetting.toolDiscoveryThreshold,
})

// 主题
const { theme: colorScheme } = setting.generalSetting
const [terminalColor, chalkTheme] = chalkColor(colorScheme)
const semanticColors: ThemeSemanticColors = getSemanticColors(colorScheme)
const spinnerName: SpinnerName = getSpinnerName(colorScheme)

// 聊天服务
const chatService = new ChatService({
    sessionManager,
    toolRegistry,
    terminalColor,
    theme: chalkTheme,
    piColors: DEFAULT_PI_COLORS,
    models,
})
chatService.setSetting(setting)

// ── 导出 ──

export {
    availableModels,
    chalkTheme,
    chatService,
    db,
    models,
    semanticColors,
    sessionManager,
    setting,
    spinnerName,
    terminalColor,
    toolRegistry,
}
