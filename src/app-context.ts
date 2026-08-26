/**
 * [INPUT]: 依赖 ./config/app-setting 的 initAppSetting/appSetting，依赖 @earendil-works/pi-ai/providers/all 的 builtinModels，
 *          依赖 ./store/agent-manager 的 AgentManager，依赖 ./llm/tool-registry 的 ToolRegistry，依赖 ./component/theme/color-scheme 的主题
 * [OUTPUT]: 组装后的 chatService / terminalColor / theme / db / models / availableModels / toolRegistry 等全局实例，初始化时传入 skills 目录
 * [POS]: src/ 的应用组装入口，被 chat-command.ts / setting-command.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import Database from 'bun:sqlite'
import type { Models } from '@earendil-works/pi-ai'
import { builtinModels } from '@earendil-works/pi-ai/providers/all'
import { ChatService } from './action/chat-service'
import { colorScheme } from './component/theme/color-scheme'
import { appSetting, initAppSetting } from './config/app-setting'
import { dataPath } from './config/data-config'
import MCPClient from './llm/mcp-client'
import { ToolRegistry } from './llm/tool-registry'
import { AgentManager } from './store/agent-manager'

// ── 初始化 ──

await initAppSetting()

const setting = await appSetting()
const { mcpServers, customTools, generalSetting } = setting
const { theme, toolDiscoveryThreshold } = generalSetting

// Pi 模型发现
const models: Models = builtinModels()
await models.refresh({ allowNetwork: true }).catch(() => {
    // 网络刷新失败不影响静态模型列表
})
const availableModels = await models.getAvailable().catch(() => [])

// 数据库
const db = new Database(dataPath.database, { strict: true })

// MCP 客户端
const mcps: MCPClient[] = (mcpServers ?? [])
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
const agentManager = new AgentManager(db)

const toolRegistry = new ToolRegistry({
    mcps,
    customTools: customTools ?? [],
    skillsDir: dataPath.skills,
    toolDiscoveryThreshold: toolDiscoveryThreshold,
})

const themeScheme = colorScheme(theme)

// 聊天服务
const chatService = new ChatService({
    agentManager,
    toolRegistry,
    themeScheme,
    models,
})
chatService.setSetting(setting)

// ── 导出 ──

export {
    agentManager,
    availableModels,
    chatService,
    db,
    models,
    setting,
    themeScheme,
    toolRegistry,
}
