/**
 * [INPUT]: 依赖 @earendil-works/pi-agent-core 的 AgentTool,
 *          依赖 ../llm/mcp-client 的 MCPClient,
 *          依赖 ../llm/pi-types 的 CustomToolDef
 * [OUTPUT]: ToolRegistry 类（buildActiveTools/listTools/closeAll），含可选的分组发现工具
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
    /** 超过此数量时只注入发现工具，否则直接注入原始 schema */
    toolDiscoveryThreshold?: number
}

interface ToolGroup {
    id: string
    name: string
    type: 'mcp' | 'custom'
    tools: { name: string; description: string }[]
}

// ── 注册表 ──

export class ToolRegistry {
    private mcps: MCPClient[]
    private customTools: CustomToolDef[]
    private activeMcpNames: Set<string> = new Set()
    private activeCustomNames: Set<string> = new Set()
    private toolDiscoveryThreshold: number

    constructor(config: ToolRegistryConfig) {
        this.mcps = config.mcps
        this.customTools = config.customTools
        this.toolDiscoveryThreshold = config.toolDiscoveryThreshold ?? 8
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
        const flatTools = new Map<string, AgentTool<any>>()
        const groups: ToolGroup[] = []

        // MCP 工具
        for (const mcp of this.mcps) {
            if (!this.activeMcpNames.has(mcp.name)) continue
            try {
                await mcp.connect()
                if (!mcp.isConnected) continue
                const mcpTools = await mcp.tools()
                if (mcpTools.length > 0) {
                    groups.push({
                        id: `mcp:${mcp.name}@${mcp.version}`,
                        name: mcp.name,
                        type: 'mcp',
                        tools: mcpTools.map((t) => ({
                            name: t.def.function.name,
                            description: t.def.function.description ?? '',
                        })),
                    })
                }
                for (const mt of mcpTools) {
                    const name = mt.def.function.name
                    if (flatTools.has(name)) continue
                    flatTools.set(name, {
                        name,
                        description: mt.def.function.description ?? '',
                        parameters: mt.def.function.parameters as Record<
                            string,
                            unknown
                        >,
                        execute: async (args: unknown) => {
                            const result = await mcp.callTool(name, args)
                            return JSON.stringify(result)
                        },
                    } as unknown as AgentTool<any>)
                }
            } catch {
                // MCP 连接失败，跳过
            }
        }

        // 自定义工具
        const customGroupMap = new Map<string, ToolGroup>()
        for (const ct of this.customTools) {
            const activeTags = (ct.tags ?? []).filter((t) =>
                this.activeCustomNames.has(t),
            )
            if (activeTags.length === 0) continue

            const name = ct.def.function.name
            if (!flatTools.has(name)) {
                flatTools.set(name, {
                    name,
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
                                        (args as Record<string, unknown>)[
                                            m[1]
                                        ] ?? '',
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
                            const errText = await new Response(
                                proc.stderr,
                            ).text()
                            return `Error (exit ${exitCode}): ${errText || output}`
                        }
                        return output
                    },
                } as unknown as AgentTool<any>)
            }

            for (const tag of activeTags) {
                let group = customGroupMap.get(tag)
                if (!group) {
                    group = {
                        id: `custom:${tag}`,
                        name: tag,
                        type: 'custom',
                        tools: [],
                    }
                    customGroupMap.set(tag, group)
                    groups.push(group)
                }
                group.tools.push({
                    name: ct.def.function.name,
                    description: ct.def.function.description,
                })
            }
        }

        if (flatTools.size > this.toolDiscoveryThreshold) {
            return this.buildDiscoveryTools(groups)
        }
        return Array.from(flatTools.values())
    }

    /** 列出所有可启用的工具分组（MCP 服务器 / 自定义工具标签） */
    availableGroups(): {
        id: string
        name: string
        type: 'mcp' | 'custom'
    }[] {
        const groups: { id: string; name: string; type: 'mcp' | 'custom' }[] =
            this.mcps.map((m) => ({
                id: `mcp:${m.name}`,
                name: m.name,
                type: 'mcp',
            }))
        const tags = [
            ...new Set(this.customTools.flatMap((ct) => ct.tags ?? [])),
        ]
        for (const tag of tags) {
            groups.push({ id: `custom:${tag}`, name: tag, type: 'custom' })
        }
        return groups
    }

    /** 关闭所有 MCP 连接 */
    async closeAll(): Promise<void> {
        await Promise.allSettled(this.mcps.map((m) => m.close()))
    }

    // ── 私有 ──

    /** 发现工具：当活跃工具数超过阈值时注入，让模型按需拉取分组/工具 */
    private buildDiscoveryTools(groups: ToolGroup[]): AgentTool<any>[] {
        return [
            {
                name: 'list_available_tool_groups',
                description:
                    '列出所有可用的工具分类（MCP 服务器和自定义工具标签）',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    return groups.length > 0
                        ? groups.map((g) => g.id)
                        : ['(no active tools)']
                },
            } as unknown as AgentTool<any>,

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
                    const group = groups.find((g) => g.id === groupName)
                    if (!group) return `Unknown group: ${groupName}`
                    return group.tools
                },
            } as unknown as AgentTool<any>,
        ]
    }
}
