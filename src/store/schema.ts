/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: SQLite 数据库结构定义字符串 SCHEM A
 * [POS]: src/store/ 的数据库结构定义，被 session-storage.ts 加载并执行
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '' UNIQUE,
    model TEXT NOT NULL DEFAULT '',
    thinking_level TEXT NOT NULL DEFAULT 'off',
    system_prompt TEXT NOT NULL DEFAULT '',
    active_mcps TEXT NOT NULL DEFAULT '[]',
    active_custom_tags TEXT NOT NULL DEFAULT '[]',
    skills TEXT NOT NULL DEFAULT '[]',
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

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`
