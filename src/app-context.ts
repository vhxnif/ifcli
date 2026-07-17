/**
 * AppContext — 应用入口，组装所有服务。
 */

import Database from 'bun:sqlite'
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
import { appSetting, customTools, initAppSetting } from './config/app-setting'
import { dataPath } from './config/data-config'
import { DEFAULT_PI_COLORS } from './llm/pi-display-handler'
import MCPClient from './llm/mcp-client'
import { ToolRegistry } from './llm/tool-registry'
import { SessionManager } from './store/session-manager'

// ── 初始化 ──

await initAppSetting()
const setting = await appSetting()
const ctools = await customTools()

// 数据库
const db = new Database(dataPath.database, { strict: true })

// MCP 客户端
const mcps: MCPClient[] = (setting.mcpServers ?? [])
    .filter(s => s.enable)
    .map(s => {
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
    customTools: ctools,
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
})
chatService.setSetting(setting)

// ── 导出 ──

export {
    chalkTheme,
    chatService,
    ctools as customToolsDefs,
    db,
    semanticColors,
    sessionManager,
    setting,
    spinnerName,
    terminalColor,
    toolRegistry,
}
