/**
 * [INPUT]: 依赖 bun:sqlite 的 Database，依赖 @earendil-works/pi-ai 的 Context/Message，
 *          依赖 @earendil-works/pi-agent-core 的 uuidv7/ThinkingLevel，
 *          依赖 ../llm/pi-types 的 AgentMeta/SessionMeta，依赖 ./session-storage 的 SqliteSessionStorage
 * [OUTPUT]: AgentManager 类（create/list/get/delete agent、session 管理、active agent 持久化）+ AgentHandle/SessionHandle 类型
 * [POS]: src/store/ 的 agent/session 两层管理入口，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type Database from 'bun:sqlite'
import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import { uuidv7 } from '@earendil-works/pi-agent-core'
import type { Context, Message } from '@earendil-works/pi-ai'
import type { AgentMeta, SessionMeta } from '../llm/pi-types'
import { ensureStorageSchema, SqliteSessionStorage } from './session-storage'

// ── 类型 ──

export interface AgentInfo extends AgentMeta {
    id: string
}

export interface SessionInfo extends SessionMeta {
    id: string
}

export interface AgentHandle {
    id: string
    info: Promise<AgentInfo>
    listSessions: () => SessionInfo[]
    createSession: (name: string) => SessionInfo
    getSession: (id: string) => SessionHandle
    deleteSession: (id: string) => void
    update: (meta: Partial<AgentMeta>) => Promise<void>
}

export interface SessionHandle {
    id: string
    agentId: string
    info: Promise<SessionInfo>
    storage: SqliteSessionStorage
    /** 获取当前 leaf 路径的所有 entry，构建为 Context */
    buildContext: () => Promise<Context>
    /** 追加一条 message entry */
    appendMessage: (message: Message) => Promise<string>
    /** 更新 session 元数据 */
    updateMeta: (meta: Partial<SessionMeta>) => Promise<void>
    /** 切换 leaf（话题分支） */
    switchLeaf: (entryId: string) => Promise<void>
}

// ── AgentManager ──

export class AgentManager {
    private db: Database

    constructor(db: Database) {
        this.db = db
        this.ensureSchema()
    }

    /** 创建 agent */
    createAgent(
        name: string,
        meta: Partial<Omit<AgentMeta, 'name'>> = {},
    ): AgentInfo {
        const existing = this.db
            .query('SELECT id FROM agent WHERE name = ?')
            .get(name) as { id: string } | undefined
        if (existing) {
            throw new Error(`Agent name already exists: ${name}`)
        }
        const id = uuidv7()
        const now = Date.now()
        this.db
            .prepare(
                `INSERT INTO agent (id, name, model, thinking_level, system_prompt, active_mcps, active_custom_tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                id,
                name,
                meta.model ?? '',
                meta.thinkingLevel ?? 'off',
                meta.systemPrompt ?? '',
                JSON.stringify(meta.activeMcps ?? []),
                JSON.stringify(meta.activeCustomTags ?? []),
                now,
                now,
            )
        return {
            id,
            name,
            model: meta.model ?? '',
            thinkingLevel: (meta.thinkingLevel ?? 'off') as ThinkingLevel,
            systemPrompt: meta.systemPrompt ?? '',
            activeMcps: meta.activeMcps ?? [],
            activeCustomTags: meta.activeCustomTags ?? [],
            createdAt: now,
            updatedAt: now,
        }
    }

    /** 列出所有 agent */
    listAgents(): AgentInfo[] {
        const rows = this.db
            .query(
                `SELECT id, name, model, thinking_level as thinkingLevel, system_prompt as systemPrompt, active_mcps as activeMcps, active_custom_tags as activeCustomTags, created_at as createdAt, updated_at as updatedAt
                 FROM agent ORDER BY updated_at DESC`,
            )
            .all() as Record<string, unknown>[]
        return rows.map((r) => this.rowToAgentInfo(r))
    }

    /** 获取 agent handle */
    getAgent(id: string): AgentHandle {
        let cachedInfo: AgentInfo | undefined
        const db = this.db

        return {
            id,
            get info() {
                return cachedInfo
                    ? Promise.resolve(cachedInfo)
                    : AgentManager.readAgentInfo(db, id).then((i) => {
                          cachedInfo = i
                          return i
                      })
            },
            listSessions: () => this.listSessions(id),
            createSession: (name: string) => this.createSession(id, name),
            getSession: (sessionId: string) => this.getSession(sessionId),
            deleteSession: (sessionId: string) => this.deleteSession(sessionId),
            update: async (meta: Partial<AgentMeta>) => {
                this.updateAgent(id, meta)
                cachedInfo = undefined
            },
        }
    }

    /** 获取当前 active agent id */
    getActiveAgentId(): string | undefined {
        const row = this.db
            .query('SELECT value FROM app_state WHERE key = ?')
            .get('active_agent_id') as { value: string } | undefined
        return row?.value
    }

    /** 设置当前 active agent id */
    setActiveAgentId(id: string): void {
        this.db
            .prepare(
                'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?',
            )
            .run('active_agent_id', id, id)
    }

    /** 删除 agent 及其下所有 session/entry */
    deleteAgent(id: string): void {
        const sessions = this.listSessions(id)
        for (const s of sessions) {
            this.deleteSession(s.id)
        }
        this.db.prepare('DELETE FROM agent WHERE id = ?').run(id)
    }

    /** 获取 agent 元数据 */
    getAgentMeta(id: string): AgentMeta {
        const row = this.db
            .query(
                `SELECT name, model, thinking_level as thinkingLevel, system_prompt as systemPrompt, active_mcps as activeMcps, active_custom_tags as activeCustomTags, created_at as createdAt, updated_at as updatedAt
                 FROM agent WHERE id = ?`,
            )
            .get(id) as Record<string, unknown> | undefined
        if (!row) {
            throw new Error(`Agent not found: ${id}`)
        }
        return this.rowToAgentMeta(row)
    }

    /** 更新 agent 元数据 */
    updateAgent(id: string, meta: Partial<AgentMeta>): void {
        const existing = this.getAgentMeta(id)
        const merged = {
            name: meta.name ?? existing.name,
            model: meta.model ?? existing.model,
            thinkingLevel: meta.thinkingLevel ?? existing.thinkingLevel,
            systemPrompt: meta.systemPrompt ?? existing.systemPrompt,
            activeMcps: meta.activeMcps ?? existing.activeMcps,
            activeCustomTags:
                meta.activeCustomTags ?? existing.activeCustomTags,
            updatedAt: Date.now(),
        }
        this.db
            .prepare(
                `UPDATE agent SET name=?, model=?, thinking_level=?, system_prompt=?, active_mcps=?, active_custom_tags=?, updated_at=? WHERE id=?`,
            )
            .run(
                merged.name,
                merged.model,
                merged.thinkingLevel,
                merged.systemPrompt,
                JSON.stringify(merged.activeMcps),
                JSON.stringify(merged.activeCustomTags),
                merged.updatedAt,
                id,
            )
    }

    /** 列出某个 agent 下的 session */
    listSessions(agentId: string): SessionInfo[] {
        const rows = this.db
            .query(
                `SELECT id, agent_id as agentId, name, created_at as createdAt, updated_at as updatedAt
                 FROM session WHERE agent_id = ? ORDER BY updated_at DESC`,
            )
            .all(agentId) as Record<string, unknown>[]
        return rows.map((r) => this.rowToSessionInfo(r))
    }

    /** 创建 session（topic） */
    createSession(agentId: string, name: string): SessionInfo {
        const id = uuidv7()
        const now = Date.now()
        this.db
            .prepare(
                `INSERT INTO session (id, agent_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
            )
            .run(id, agentId, name, now, now)
        return {
            id,
            agentId,
            name,
            createdAt: now,
            updatedAt: now,
        }
    }

    /** 获取 session handle */
    getSession(id: string): SessionHandle {
        const storage = new SqliteSessionStorage(this.db, id)
        const sessionRow = this.db
            .query(
                `SELECT agent_id as agentId, name, created_at as createdAt, updated_at as updatedAt FROM session WHERE id = ?`,
            )
            .get(id) as Record<string, unknown> | undefined
        if (!sessionRow) {
            throw new Error(`Session not found: ${id}`)
        }
        const agentId = (sessionRow.agentId as string) ?? ''
        let cachedInfo: SessionInfo = {
            id,
            agentId,
            name: (sessionRow.name as string) || '(unnamed)',
            createdAt: (sessionRow.createdAt as number) ?? Date.now(),
            updatedAt: (sessionRow.updatedAt as number) ?? Date.now(),
        }

        const refreshInfo = async () => {
            const meta = await storage.getMetadata()
            cachedInfo = {
                id,
                agentId: meta.agentId || agentId,
                name: meta.name || '(unnamed)',
                createdAt: meta.createdAt,
                updatedAt: meta.updatedAt,
            }
            return cachedInfo
        }

        return {
            id,
            agentId,
            get info() {
                return Promise.resolve(cachedInfo)
            },
            storage,
            buildContext: async () => {
                const agentMeta = this.getAgentMeta(agentId)
                const path = await storage.getPathToRoot()
                const messages: Message[] = []
                for (const entry of path) {
                    if (entry.entryType === 'message') {
                        try {
                            messages.push(JSON.parse(entry.content) as Message)
                        } catch {
                            // skip malformed
                        }
                    }
                    if (
                        entry.entryType === 'compaction' ||
                        entry.entryType === 'branch_summary'
                    ) {
                        const c = JSON.parse(entry.content) as {
                            summary: string
                        }
                        if (c.summary) {
                            messages.push({
                                role: 'user',
                                content: `<summary>${c.summary}</summary>`,
                                timestamp: entry.timestamp,
                            } as Message)
                        }
                    }
                }
                return {
                    systemPrompt: agentMeta.systemPrompt || undefined,
                    messages,
                } satisfies Context
            },
            appendMessage: async (message: Message) => {
                const entryId = uuidv7()
                const leafId = await storage.getLeafId()
                const entry = {
                    id: entryId,
                    sessionId: id,
                    parentId: leafId,
                    entryType: 'message' as const,
                    content: JSON.stringify(message),
                }
                await storage.appendEntry(entry)
                return entryId
            },
            updateMeta: async (meta: Partial<SessionMeta>) => {
                await storage.setMetadata(meta)
                await refreshInfo()
            },
            switchLeaf: async (entryId: string) => {
                await storage.setLeafId(entryId)
            },
        }
    }

    /** 删除 session 及其 entry */
    deleteSession(id: string): void {
        this.db
            .prepare('DELETE FROM session_entry WHERE session_id = ?')
            .run(id)
        this.db.prepare('DELETE FROM session_leaf WHERE session_id = ?').run(id)
        this.db.prepare('DELETE FROM session WHERE id = ?').run(id)
    }

    /** 自动命名：由外部注入的 nameFn 处理 */
    async autoName(
        handle: SessionHandle,
        nameFn: (content: string, modelStr: string) => Promise<string>,
    ): Promise<void> {
        const info = await handle.info
        if (info.name && info.name !== '') return
        const entries = await handle.storage.getEntries()
        const firstUserMsg = entries.find(
            (e) =>
                e.entryType === 'message' &&
                JSON.parse(e.content).role === 'user',
        )
        if (!firstUserMsg) return
        try {
            const msg = JSON.parse(firstUserMsg.content) as Message
            const content =
                typeof msg.content === 'string'
                    ? msg.content
                    : JSON.stringify(msg.content)
            const agentMeta = this.getAgentMeta(info.agentId)
            const name = await nameFn(content, agentMeta.model)
            if (name) {
                await handle.updateMeta({ name })
            }
        } catch {
            // 命名失败不影响使用
        }
    }

    // ── 私有 ──

    private ensureSchema(): void {
        ensureStorageSchema(this.db)
    }

    private rowToAgentInfo(row: Record<string, unknown>): AgentInfo {
        return {
            id: row.id as string,
            name: (row.name as string) || '(unnamed)',
            model: (row.model as string) ?? '',
            thinkingLevel: (row.thinkingLevel as ThinkingLevel) ?? 'off',
            systemPrompt: (row.systemPrompt as string) ?? '',
            activeMcps: this.parseArr(row.activeMcps),
            activeCustomTags: this.parseArr(row.activeCustomTags),
            createdAt: (row.createdAt as number) ?? Date.now(),
            updatedAt: (row.updatedAt as number) ?? Date.now(),
        }
    }

    private rowToAgentMeta(row: Record<string, unknown>): AgentMeta {
        return {
            name: (row.name as string) || '(unnamed)',
            model: (row.model as string) ?? '',
            thinkingLevel: (row.thinkingLevel as ThinkingLevel) ?? 'off',
            systemPrompt: (row.systemPrompt as string) ?? '',
            activeMcps: this.parseArr(row.activeMcps),
            activeCustomTags: this.parseArr(row.activeCustomTags),
            createdAt: (row.createdAt as number) ?? Date.now(),
            updatedAt: (row.updatedAt as number) ?? Date.now(),
        }
    }

    private rowToSessionInfo(row: Record<string, unknown>): SessionInfo {
        return {
            id: row.id as string,
            agentId: (row.agentId as string) ?? '',
            name: (row.name as string) || '(unnamed)',
            createdAt: (row.createdAt as number) ?? Date.now(),
            updatedAt: (row.updatedAt as number) ?? Date.now(),
        }
    }

    private parseArr(raw: unknown): string[] {
        if (typeof raw !== 'string' || raw === '') return []
        try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    private static async readAgentInfo(
        db: Database,
        id: string,
    ): Promise<AgentInfo> {
        const row = db
            .query(
                `SELECT name, model, thinking_level as thinkingLevel, system_prompt as systemPrompt, active_mcps as activeMcps, active_custom_tags as activeCustomTags, created_at as createdAt, updated_at as updatedAt
                 FROM agent WHERE id = ?`,
            )
            .get(id) as Record<string, unknown> | undefined
        if (!row) {
            throw new Error(`Agent not found: ${id}`)
        }
        return {
            id,
            name: (row.name as string) || '(unnamed)',
            model: (row.model as string) ?? '',
            thinkingLevel: (row.thinkingLevel as ThinkingLevel) ?? 'off',
            systemPrompt: (row.systemPrompt as string) ?? '',
            activeMcps:
                typeof row.activeMcps === 'string'
                    ? JSON.parse(row.activeMcps)
                    : [],
            activeCustomTags:
                typeof row.activeCustomTags === 'string'
                    ? JSON.parse(row.activeCustomTags)
                    : [],
            createdAt: (row.createdAt as number) ?? Date.now(),
            updatedAt: (row.updatedAt as number) ?? Date.now(),
        }
    }
}
