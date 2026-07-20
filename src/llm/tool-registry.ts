/**
 * [INPUT]: 依赖 @earendil-works/pi-agent-core 的 AgentTool,
 *          依赖 ../llm/mcp-client 的 MCPClient,
 *          依赖 ../llm/pi-types 的 CustomToolDef
 * [OUTPUT]: ToolRegistry 类（buildActiveTools/listTools/closeAll），含 base 分组发现工具
 * [POS]: src/llm/ 的工具注册层，替代旧 tool.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { AgentTool } from '@earendil-works/pi-agent-core'
import type MCPClient from '../llm/mcp-client'
import type { CustomToolDef } from './pi-types'

// ── 类型 ──

export interface ToolRegistryConfig {
    mcps: MCPClient[]
    customTools: CustomToolDef[]
}

// ── 注册表 ──

export class ToolRegistry {
    private mcps: MCPClient[]
    private customTools: CustomToolDef[]
    private activeMcpNames: Set<string> = new Set()
    private activeCustomNames: Set<string> = new Set()

    constructor(config: ToolRegistryConfig) {
        this.mcps = config.mcps
        this.customTools = config.customTools
    }

    /** 设置活跃的 MCP 服务器 */
    setActiveMcps(names: string[]): void {
        this.activeMcpNames = new Set(names)
    }

    /** 设置活跃的自定义工具 */
    setActiveCustomTools(tags: string[]): void {
        this.activeCustomNames = new Set(tags)
    }

    /** 获取所有工具的列表（供 UI 展示） */
    listTools(): { name: string; source: 'mcp' | 'custom'; tags: string[] }[] {
        const result: {
            name: string
            source: 'mcp' | 'custom'
            tags: string[]
        }[] = []

        for (const mcp of this.mcps) {
            result.push({
                name: mcp.name,
                source: 'mcp',
                tags: [mcp.version],
            })
        }

        for (const ct of this.customTools) {
            result.push({
                name: ct.def.function.name,
                source: 'custom',
                tags: ct.tags ?? [],
            })
        }

        return result
    }

    /** 构建当前活跃的 AgentTool 列表（用于注入 Agent） */
    async buildActiveTools(): Promise<AgentTool<any>[]> {
        const tools: AgentTool<any>[] = []

        // 添加 base 工具（分组发现）
        tools.push(...this.baseDiscoveryTools())

        // MCP 工具
        for (const mcp of this.mcps) {
            if (!this.activeMcpNames.has(mcp.name)) continue
            try {
                await mcp.connect()
                if (!mcp.isConnected) continue
                const mcpTools = await mcp.tools()
                for (const mt of mcpTools) {
                    tools.push({
                        name: mt.def.function.name,
                        description: mt.def.function.description ?? '',
                        parameters: mt.def.function.parameters as Record<
                            string,
                            unknown
                        >,
                        execute: async (args: unknown) => {
                            const result = await mcp.callTool(
                                mt.def.function.name,
                                args,
                            )
                            return JSON.stringify(result)
                        },
                    } as unknown as AgentTool<any>)
                }
            } catch {
                // MCP 连接失败，跳过
            }
        }

        // 自定义工具
        for (const ct of this.customTools) {
            if (!(ct.tags ?? []).some((t) => this.activeCustomNames.has(t)))
                continue

            tools.push({
                name: ct.def.function.name,
                description: ct.def.function.description,
                parameters: ct.def.function.parameters as Record<
                    string,
                    unknown
                >,
                execute: async (args: unknown) => {
                    const cmd = ct.command
                        .map((part) => {
                            const m = part.match(/^\$\{([^}]+)\}$/)
                            if (m && args && typeof args === 'object') {
                                return String(
                                    (args as Record<string, unknown>)[m[1]] ??
                                        '',
                                )
                            }
                            return part
                        })
                        .join(' ')

                    const proc = Bun.spawn(['sh', '-c', cmd], {
                        stdout: 'pipe',
                        stderr: 'pipe',
                    })
                    const output = await new Response(proc.stdout).text()
                    const exitCode = await proc.exited
                    if (exitCode !== 0) {
                        const errText = await new Response(proc.stderr).text()
                        return `Error (exit ${exitCode}): ${errText || output}`
                    }
                    return output
                },
            } as unknown as AgentTool<any>)
        }

        return tools
    }

    /** 关闭所有 MCP 连接 */
    async closeAll(): Promise<void> {
        await Promise.allSettled(this.mcps.map((m) => m.close()))
    }

    // ── 私有 ──

    /** base 工具：帮助模型发现分组和工具 */
    private baseDiscoveryTools(): AgentTool<any>[] {
        const mcps = this.mcps
        const customTools = this.customTools

        return [
            // list_available_tool_groups
            {
                name: 'list_available_tool_groups',
                description:
                    '列出所有可用的工具分类（MCP 服务器和自定义工具标签）',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    const groups = [
                        ...mcps
                            .filter((m) => this.activeMcpNames.has(m.name))
                            .map((m) => `mcp:${m.name}@${m.version}`),
                        ...[
                            ...new Set(
                                customTools
                                    .filter((ct) =>
                                        (ct.tags ?? []).some((t) =>
                                            this.activeCustomNames.has(t),
                                        ),
                                    )
                                    .flatMap((ct) => ct.tags ?? []),
                            ),
                        ].map((t) => `custom:${t}`),
                    ]
                    return groups.length > 0 ? groups : ['(no active tools)']
                },
            } as unknown as AgentTool<any>,

            // list_available_tools
            {
                name: 'list_available_tools',
                description: '列出指定分类下的所有工具',
                parameters: {
                    type: 'object',
                    properties: {
                        group_name: {
                            type: 'string',
                            description:
                                '分类名（从 list_available_tool_groups 获取）',
                        },
                    },
                    required: ['group_name'],
                },
                execute: async (args: any) => {
                    const groupName: string = args.group_name
                    if (groupName.startsWith('mcp:')) {
                        const mcpName = groupName.slice(4).split('@')[0]
                        const mcp = mcps.find((m) => m.name === mcpName)
                        if (!mcp) return `MCP "${mcpName}" not found`
                        return (await mcp.tools()).map((t) => ({
                            name: t.def.function.name,
                            description: t.def.function.description ?? '',
                        }))
                    }
                    if (groupName.startsWith('custom:')) {
                        const tag = groupName.slice(7)
                        return customTools
                            .filter(
                                (ct) =>
                                    (ct.tags ?? []).includes(tag) &&
                                    this.activeCustomNames.has(tag),
                            )
                            .map((ct) => ({
                                name: ct.def.function.name,
                                description: ct.def.function.description,
                            }))
                    }
                    return `Unknown group: ${groupName}`
                },
            } as unknown as AgentTool<any>,
        ]
    }
}
