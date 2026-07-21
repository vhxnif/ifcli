/**
 * [INPUT]: 依赖 bun:sqlite 的 Database，
 *          依赖 ../llm/pi-types 的 SessionEntry/SessionEntryType/SessionMeta/SessionStorage
 * [OUTPUT]: SqliteSessionStorage 类（实现 SessionStorage 接口 — getMetadata/setMetadata/appendEntry/getPathToRoot 等）
 * [POS]: src/store/ 的 SQLite 存储实现，替代旧 db-client.ts + table-def.ts + store.ts + store-types.ts，被 agent-manager 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type Database from 'bun:sqlite'
import type {
    SessionEntry,
    SessionEntryType,
    SessionMeta,
    SessionStorage,
} from '../llm/pi-types'

// ── SQL schema ──

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS agent (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '' UNIQUE,
    model TEXT NOT NULL DEFAULT '',
    thinking_level TEXT NOT NULL DEFAULT 'off',
    system_prompt TEXT NOT NULL DEFAULT '',
    active_mcps TEXT NOT NULL DEFAULT '[]',
    active_custom_tags TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agent(id)
);

CREATE TABLE IF NOT EXISTS session_entry (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT,
    entry_type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE INDEX IF NOT EXISTS idx_entry_session ON session_entry(session_id);
CREATE INDEX IF NOT EXISTS idx_entry_parent ON session_entry(parent_id);
CREATE INDEX IF NOT EXISTS idx_entry_type ON session_entry(entry_type);

CREATE TABLE IF NOT EXISTS session_leaf (
    session_id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (session_id) REFERENCES session(id)
);
`

// ── 实现 ──

export class SqliteSessionStorage implements SessionStorage {
    private db: Database
    private sessionId: string

    constructor(db: Database, sessionId: string) {
        this.db = db
        this.sessionId = sessionId
        ensureStorageSchema(this.db)
    }

    // ── Metadata ──

    async getMetadata(): Promise<SessionMeta> {
        const row = this.db
            .query(
                `SELECT agent_id as agentId, name, created_at as createdAt, updated_at as updatedAt
                 FROM session WHERE id = ?`,
            )
            .get(this.sessionId) as Record<string, unknown> | undefined

        // 如果行不存在（session 尚未 create），返回默认值
        return {
            agentId: (row?.agentId as string) || '',
            name: (row?.name as string) || '',
            createdAt: (row?.createdAt as number) || Date.now(),
            updatedAt: (row?.updatedAt as number) || Date.now(),
        }
    }

    async setMetadata(meta: Partial<SessionMeta>): Promise<void> {
        const existing = await this.getMetadata()
        const merged = {
            agentId: meta.agentId ?? existing.agentId ?? '',
            name: meta.name ?? existing.name ?? '',
            createdAt: meta.createdAt ?? existing.createdAt ?? Date.now(),
            updatedAt: Date.now(),
        }

        this.db
            .prepare(
                `INSERT OR REPLACE INTO session (id, agent_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
            )
            .run(
                this.sessionId,
                merged.agentId,
                merged.name,
                merged.createdAt,
                merged.updatedAt,
            )
    }

    // ── Leaf ──

    async getLeafId(): Promise<string | null> {
        const row = this.db
            .query('SELECT entry_id FROM session_leaf WHERE session_id = ?')
            .get(this.sessionId) as { entry_id: string } | undefined
        return row?.entry_id ?? null
    }

    async setLeafId(entryId: string): Promise<void> {
        this.db
            .prepare(
                `INSERT INTO session_leaf (session_id, entry_id) VALUES (?, ?) ON CONFLICT(session_id) DO UPDATE SET entry_id=?`,
            )
            .run(this.sessionId, entryId, entryId)
    }

    // ── Entries ──

    async getEntry(id: string): Promise<SessionEntry | undefined> {
        const row = this.db
            .query(
                `SELECT id, session_id as sessionId, parent_id as parentId, entry_type as entryType, content, "order", timestamp
                 FROM session_entry WHERE id = ?`,
            )
            .get(id) as Record<string, unknown> | undefined
        return row ? this.rowToEntry(row) : undefined
    }

    async getEntries(): Promise<SessionEntry[]> {
        const rows = this.db
            .query(
                `SELECT id, session_id as sessionId, parent_id as parentId, entry_type as entryType, content, "order", timestamp
                 FROM session_entry WHERE session_id = ? ORDER BY "order"`,
            )
            .all(this.sessionId) as Record<string, unknown>[]
        return rows.map((r) => this.rowToEntry(r))
    }

    async appendEntry(
        entry: Omit<SessionEntry, 'order' | 'timestamp'>,
    ): Promise<string> {
        const now = Date.now()
        // 获取同 parent 下的最大 order
        const maxOrder = this.db
            .query(
                `SELECT COALESCE(MAX("order"), -1) as mx FROM session_entry WHERE session_id = ? AND parent_id IS NOT DISTINCT FROM ?`,
            )
            .get(this.sessionId, entry.parentId) as { mx: number }
        const order = maxOrder.mx + 1

        this.db
            .prepare(
                `INSERT INTO session_entry (id, session_id, parent_id, entry_type, content, "order", timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                entry.id,
                this.sessionId,
                entry.parentId,
                entry.entryType,
                entry.content,
                order,
                now,
            )

        // 设为 leaf
        await this.setLeafId(entry.id)
        return entry.id
    }

    async getPathToRoot(fromId?: string | null): Promise<SessionEntry[]> {
        const leafId = fromId ?? (await this.getLeafId())
        if (!leafId) return []

        const path: SessionEntry[] = []
        let currentId: string | null = leafId
        const visited = new Set<string>()

        while (currentId && !visited.has(currentId)) {
            visited.add(currentId)
            const entry = await this.getEntry(currentId)
            if (!entry) break
            path.unshift(entry)
            currentId = entry.parentId
        }

        return path
    }

    async findEntries(entryType: SessionEntryType): Promise<SessionEntry[]> {
        const rows = this.db
            .query(
                `SELECT id, session_id as sessionId, parent_id as parentId, entry_type as entryType, content, "order", timestamp
                 FROM session_entry WHERE session_id = ? AND entry_type = ? ORDER BY "order"`,
            )
            .all(this.sessionId, entryType) as Record<string, unknown>[]
        return rows.map((r) => this.rowToEntry(r))
    }

    // ── 辅助 ──

    private rowToEntry(row: Record<string, unknown>): SessionEntry {
        return {
            id: row.id as string,
            sessionId: row.sessionId as string,
            parentId: (row.parentId as string) ?? null,
            entryType: row.entryType as SessionEntryType,
            content: row.content as string,
            order: row.order as number,
            timestamp: row.timestamp as number,
        }
    }
}

export function ensureStorageSchema(db: Database): void {
    db.run('PRAGMA journal_mode = WAL')
    db.run('PRAGMA foreign_keys = ON')
    for (const stmt of SCHEMA.split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        db.run(stmt)
    }
}
