/**
 * [INPUT]: 依赖 @earendil-works/pi-agent-core 的 AgentTool,
 *          依赖 ../llm/mcp-client 的 MCPClient,
 *          依赖 ../llm/pi-types 的 CustomToolDef
 * [OUTPUT]: ToolRegistry 类（buildActiveTools/listTools/closeAll/availableSkills），含 MCP/custom/skill 三类工具；skill 支持返回目录文件列表及读取 skill 内文件
 * [POS]: src/llm/ 的工具注册层，替代旧 tool.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import type {
    AgentTool,
    AgentToolUpdateCallback,
} from '@earendil-works/pi-agent-core'
import type { Static } from '@earendil-works/pi-ai'
import type MCPClient from '../llm/mcp-client'
import type { CustomToolDef } from './pi-types'

// ── 类型 ──

export interface ToolRegistryConfig {
    mcps: MCPClient[]
    customTools: CustomToolDef[]
    /** skill 根目录，递归加载其子目录下的 SKILL.md */
    skillsDir?: string
    /** 超过此数量时只注入发现工具，否则直接注入原始 schema */
    toolDiscoveryThreshold?: number
}

interface ToolGroup {
    id: string
    name: string
    type: 'mcp' | 'custom'
    tools: { name: string; description: string }[]
}

export interface Skill {
    name: string
    description: string
    basePath: string
    content: string
    frontMatter: Record<string, unknown>
    /** skill 目录下相对 basePath 的文件列表 */
    files: string[]
}

// ── 注册表 ──

export class ToolRegistry {
    private mcps: MCPClient[]
    private customTools: CustomToolDef[]
    private skills: Skill[] = []
    private activeMcpNames: Set<string> = new Set()
    private activeCustomNames: Set<string> = new Set()
    private activeSkillNames: Set<string> = new Set()
    private toolDiscoveryThreshold: number

    constructor(config: ToolRegistryConfig) {
        this.mcps = config.mcps
        this.customTools = config.customTools
        this.toolDiscoveryThreshold = config.toolDiscoveryThreshold ?? 8
        if (config.skillsDir) {
            this.skills = this.loadSkills(config.skillsDir)
        }
    }

    /** 设置活跃的 MCP 服务器 */
    setActiveMcps(names: string[]): void {
        this.activeMcpNames = new Set(names)
    }

    /** 设置活跃的自定义工具 */
    setActiveCustomTools(tags: string[]): void {
        this.activeCustomNames = new Set(tags)
    }

    /** 设置活跃的 skill 名称 */
    setActiveSkills(names: string[]): void {
        this.activeSkillNames = new Set(names)
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

    /** 列出所有可用的 skill */
    availableSkills(): { name: string; description: string }[] {
        return this.skills.map((s) => ({
            name: s.name,
            description: s.description,
        }))
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
                        execute: async (
                            _toolCallId: string,
                            params: Static<any>,
                            _signal?: AbortSignal,
                            _onUpdate?: AgentToolUpdateCallback<any>,
                        ) => {
                            const result = await mcp.callTool(name, params)
                            return {
                                content: result.content,
                                details: void 0,
                            }
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
                    execute: async (
                        _toolCallId: string,
                        params: Static<any>,
                        _signal?: AbortSignal,
                        _onUpdate?: AgentToolUpdateCallback<any>,
                    ) => {
                        const cmd = ct.command
                            .map((part) => {
                                const m = part.match(/^\$\{([^}]+)\}$/)
                                if (m && params && typeof params === 'object') {
                                    return String(
                                        (params as Record<string, unknown>)[
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
                            return this.toolResult(
                                `Error (exit ${exitCode}): ${errText || output}`,
                            )
                        }
                        return this.toolResult(output)
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

        // Skill 工具：把启用的 skill 注册为统一的 Skill 调用入口
        const activeSkills = this.skills.filter((s) =>
            this.activeSkillNames.has(s.name),
        )
        if (activeSkills.length > 0) {
            const skillsXml = activeSkills
                .map(
                    (s) =>
                        `<skill>\n  <name>${s.name}</name>\n  <description>${s.description}</description>\n  <basePath>${s.basePath}</basePath>\n</skill>`,
                )
                .join('\n')
            flatTools.set('Skill', {
                name: 'Skill',
                description: `Execute a skill within the main conversation.

<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke a skill by passing its name as the "command" parameter, e.g. {"command": "readlink"}
- The response includes the skill's base directory, a list of files inside the skill, and the SKILL.md content
- To read a specific file inside a skill, use {"command": "<skill-name>:<relative-file-path>"}, e.g. {"command": "readlink:clean_markdown.lua"}
- Only use skills listed in <available_skills> below
</skills_instructions>

<available_skills>
${skillsXml}
</available_skills>`,
                parameters: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description:
                                'Skill name (e.g. "readlink") or "<skill-name>:<relative-file-path>" to read a file inside the skill',
                        },
                    },
                    required: ['command'],
                },
                execute: async (
                    _toolCallId: string,
                    { command }: { command: string },
                    _signal?: AbortSignal,
                    _onUpdate?: AgentToolUpdateCallback<any>,
                ) => {
                    const colonIdx = command.indexOf(':')

                    // 读取 skill 内指定文件: <skill-name>:<relative-path>
                    if (colonIdx > 0) {
                        const skillName = command.slice(0, colonIdx)
                        const filePath = command.slice(colonIdx + 1)
                        const skill = activeSkills.find(
                            (s) => s.name === skillName,
                        )
                        if (!skill) return `Skill not found: ${skillName}`
                        const fullPath = path.join(skill.basePath, filePath)
                        try {
                            const content = readFileSync(fullPath, 'utf-8')
                            return this.toolResult(
                                `File: ${filePath}\n\n${content}`,
                            )
                        } catch {
                            return this.toolResult(
                                `File not found in skill ${skillName}: ${filePath}`,
                            )
                        }
                    }

                    // 返回 skill 信息 + SKILL.md 内容
                    const skill = activeSkills.find((s) => s.name === command)
                    if (!skill) return `Skill not found: ${command}`
                    const filesList =
                        skill.files.length > 0
                            ? skill.files.map((f) => `  - ${f}`).join('\n')
                            : '  (no additional files)'
                    return this.toolResult(
                        `Base directory for this skill: ${skill.basePath}\n\nFiles in this skill:\n${filesList}\n\n${skill.content}`,
                    )
                },
            } as unknown as AgentTool<any>)
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

    /** 加载 skills 目录下每个子目录中的 SKILL.md 及其文件列表 */
    private loadSkills(rootDir: string): Skill[] {
        const skills: Skill[] = []
        if (!this.skillsDirExists(rootDir)) return skills

        for (const entry of readdirSync(rootDir)) {
            const skillDir = path.join(rootDir, entry)
            if (!statSync(skillDir).isDirectory()) continue

            const files: string[] = []
            const walk = (dir: string) => {
                for (const child of readdirSync(dir)) {
                    const fullPath = path.join(dir, child)
                    if (statSync(fullPath).isDirectory()) {
                        walk(fullPath)
                    } else {
                        files.push(path.relative(skillDir, fullPath))
                    }
                }
            }
            walk(skillDir)

            const skillMdPath = path.join(skillDir, 'SKILL.md')
            try {
                const markdown = readFileSync(skillMdPath, 'utf-8')
                skills.push(this.parseSkill(markdown, skillDir, files))
            } catch {
                // 没有 SKILL.md 则跳过
            }
        }
        return skills
    }

    private toolResult(text: string) {
        return {
            content: [
                {
                    type: 'text',
                    text: text,
                },
            ],
            details: void 0,
        }
    }

    private skillsDirExists(rootDir: string): boolean {
        try {
            return statSync(rootDir).isDirectory()
        } catch {
            return false
        }
    }

    private parseSkill(
        markdown: string,
        basePath: string,
        files: string[],
    ): Skill {
        const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
        if (!match) {
            return {
                name: path.basename(basePath),
                description: '',
                basePath,
                content: markdown.trim(),
                frontMatter: {},
                files,
            }
        }
        const frontMatter = this.parseFrontMatter(match[1])
        return {
            name: String(frontMatter.name ?? path.basename(basePath)),
            description: String(frontMatter.description ?? ''),
            basePath,
            content: match[2].trim(),
            frontMatter,
            files,
        }
    }

    private parseFrontMatter(raw: string): Record<string, unknown> {
        const result: Record<string, unknown> = {}
        for (const line of raw.split('\n')) {
            const idx = line.indexOf(':')
            if (idx <= 0) continue
            const key = line.slice(0, idx).trim()
            const value = line.slice(idx + 1).trim()
            result[key] = value
        }
        return result
    }

    /** 发现工具：当活跃工具数超过阈值时注入，让模型按需拉取分组/工具 */
    private buildDiscoveryTools(groups: ToolGroup[]): AgentTool<any>[] {
        return [
            {
                name: 'list_available_tool_groups',
                description:
                    '列出所有可用的工具分类（MCP 服务器和自定义工具标签）',
                parameters: { type: 'object', properties: {} },
                execute: async (
                    _toolCallId: string,
                    _params: any,
                    _signal?: AbortSignal,
                    _onUpdate?: AgentToolUpdateCallback<any>,
                ) => {
                    const res =
                        groups.length > 0
                            ? groups.map((g) => g.id)
                            : ['(no active tools)']
                    return this.toolResult(JSON.stringify(res))
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
                    if (!group)
                        return this.toolResult(`Unknown group: ${groupName}`)

                    return this.toolResult(JSON.stringify(group.tools))
                },
            } as unknown as AgentTool<any>,
        ]
    }
}
