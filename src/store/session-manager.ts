/**
 * [INPUT]: 依赖 bun:sqlite 的 Database，依赖 @earendil-works/pi-ai 的 Context/Message，
 *          依赖 @earendil-works/pi-agent-core 的 uuidv7/ThinkingLevel，
 *          依赖 ../llm/pi-types 的 SessionMeta，依赖 ./session-storage 的 SqliteSessionStorage
 * [OUTPUT]: SessionManager 类（create/list/get/delete/autoName），SessionInfo/SessionHandle 类型
 * [POS]: src/store/ 的多 session 管理入口，替代旧 store.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type Database from 'bun:sqlite'
import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import { uuidv7 } from '@earendil-works/pi-agent-core'
import type { Context, Message } from '@earendil-works/pi-ai'
import type { SessionMeta } from '../llm/pi-types'
import { SqliteSessionStorage } from './session-storage'

// ── 类型 ──

export interface SessionInfo {
    id: string
    name: string
    model: string
    thinkingLevel: ThinkingLevel
    createdAt: number
    updatedAt: number
}

export interface SessionHandle {
    id: string
    info: Promise<SessionInfo>
    storage: SqliteSessionStorage
    /** 获取当前 leaf 路径的所有 entry，构建为 Context */
    buildContext: () => Promise<Context>
    /** 追加一条 message entry */
    appendMessage: (message: Message) => Promise<string>
    /** 更新元数据 */
    updateMeta: (meta: Partial<SessionMeta>) => Promise<void>
    /** 切换 leaf（话题） */
    switchLeaf: (entryId: string) => Promise<void>
}

// ── SessionManager ──

export class SessionManager {
    private db: Database

    constructor(db: Database) {
        this.db = db
        // 确保所有表存在
        this.db.run(`
            CREATE TABLE IF NOT EXISTS session (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT '',
                thinking_level TEXT NOT NULL DEFAULT 'off',
                system_prompt TEXT NOT NULL DEFAULT '',
                active_mcps TEXT NOT NULL DEFAULT '[]',
                active_custom_tags TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS session_entry (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                parent_id TEXT,
                entry_type TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '{}',
                "order" INTEGER NOT NULL DEFAULT 0,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES session(id)
            )
        `)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS session_leaf (
                session_id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (session_id) REFERENCES session(id)
            )
        `)
    }

    /** 列出所有 session */
    list(): SessionInfo[] {
        const rows = this.db
            .query(
                `SELECT id, name, model, thinking_level as thinkingLevel, created_at as createdAt, updated_at as updatedAt
                 FROM session ORDER BY updated_at DESC`,
            )
            .all() as Record<string, unknown>[]
        return rows.map((r) => ({
            id: r.id as string,
            name: (r.name as string) || '(unnamed)',
            model: r.model as string,
            thinkingLevel: (r.thinkingLevel as ThinkingLevel) ?? 'off',
            createdAt: r.createdAt as number,
            updatedAt: r.updatedAt as number,
        }))
    }

    /** 创建新 session */
    create(
        name: string,
        model: string,
        thinkingLevel: ThinkingLevel = 'off',
    ): SessionInfo {
        const id = uuidv7()
        const now = Date.now()
        // 使用 INSERT OR REPLACE 以防 SqliteSessionStorage 已先行插入了默认行
        this.db
            .prepare(
                `INSERT OR REPLACE INTO session (id, name, model, thinking_level, system_prompt, active_mcps, active_custom_tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(id, name, model, thinkingLevel, '', '[]', '[]', now, now)
        return {
            id,
            name,
            model,
            thinkingLevel,
            createdAt: now,
            updatedAt: now,
        }
    }

    /** 获取 session handle */
    get(id: string): SessionHandle {
        const storage = new SqliteSessionStorage(this.db, id)
        let cachedInfo: SessionInfo | undefined

        const handle: SessionHandle = {
            id,
            storage,
            get info() {
                return cachedInfo
                    ? Promise.resolve(cachedInfo)
                    : SessionManager.readInfo(storage).then((i) => {
                          cachedInfo = i
                          return i
                      })
            },
            async buildContext() {
                const meta = await storage.getMetadata()
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
                    // compaction / branch_summary 作为 system 消息注入
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
                    systemPrompt: meta.systemPrompt || undefined,
                    messages,
                } satisfies Context
            },
            async appendMessage(message: Message) {
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
            async updateMeta(meta: Partial<SessionMeta>) {
                await storage.setMetadata(meta)
            },
            async switchLeaf(entryId: string) {
                await storage.setLeafId(entryId)
            },
        }

        return handle
    }

    /** 删除 session */
    delete(id: string): void {
        this.db
            .prepare('DELETE FROM session_entry WHERE session_id = ?')
            .run(id)
        this.db.prepare('DELETE FROM session_leaf WHERE session_id = ?').run(id)
        this.db.prepare('DELETE FROM session WHERE id = ?').run(id)
    }

    /** 自动命名：由外部注入的 nameFn 处理（需要 Pi Models 上下文） */
    async autoName(
        handle: SessionHandle,
        nameFn: (content: string, modelStr: string) => Promise<string>,
    ): Promise<void> {
        const meta = await handle.storage.getMetadata()
        if (!meta.name || meta.name === '') {
            const entries = await handle.storage.getEntries()
            const firstUserMsg = entries.find(
                (e) =>
                    e.entryType === 'message' &&
                    JSON.parse(e.content).role === 'user',
            )
            if (firstUserMsg) {
                try {
                    const msg = JSON.parse(firstUserMsg.content) as Message
                    const content =
                        typeof msg.content === 'string'
                            ? msg.content
                            : JSON.stringify(msg.content)
                    const name = await nameFn(content, meta.model)
                    if (name) {
                        await handle.updateMeta({ name })
                    }
                } catch {
                    // 命名失败不影响使用
                }
            }
        }
    }

    // ── 私有 ──

    private static async readInfo(
        storage: SqliteSessionStorage,
    ): Promise<SessionInfo> {
        const meta = await storage.getMetadata()
        return {
            id: '', // 由外层填充
            name: meta.name || '(unnamed)',
            model: meta.model,
            thinkingLevel: meta.thinkingLevel,
            createdAt: meta.createdAt,
            updatedAt: meta.updatedAt,
        }
    }
}
