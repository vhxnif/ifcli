/**
 * 测试 SqliteSessionStorage — 新的树形存储层。
 */

import Database from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { SqliteSessionStorage } from '../src/store/session-storage'

describe('SqliteSessionStorage', () => {
    let db: Database
    let storage: SqliteSessionStorage
    let sessionId: string

    beforeEach(async () => {
        db = new Database(':memory:')
        sessionId = 'test-session'
        // 先插入 session 行以满足外键约束
        db.run(
            "CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', thinking_level TEXT NOT NULL DEFAULT 'off', system_prompt TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
        )
        db.prepare(
            'INSERT INTO session (id, name, model, thinking_level, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(sessionId, '', '', 'off', '', Date.now(), Date.now())
        storage = new SqliteSessionStorage(db, sessionId)
    })

    afterEach(() => {
        db.close()
    })

    test('should initialize with default metadata', async () => {
        const meta = await storage.getMetadata()
        expect(meta.name).toBe('')
        expect(meta.model).toBe('')
        expect(meta.thinkingLevel).toBe('off')
    })

    test('should set and get metadata', async () => {
        await storage.setMetadata({
            name: 'Test Chat',
            model: 'deepseek/deepseek-chat',
            thinkingLevel: 'high',
            systemPrompt: 'You are helpful.',
        })
        const meta = await storage.getMetadata()
        expect(meta.name).toBe('Test Chat')
        expect(meta.model).toBe('deepseek/deepseek-chat')
        expect(meta.thinkingLevel).toBe('high')
        expect(meta.systemPrompt).toBe('You are helpful.')
    })

    test('should append entries and track leaf', async () => {
        await storage.appendEntry({
            id: 'entry-1',
            sessionId: 'test-session',
            parentId: null,
            entryType: 'message',
            content: JSON.stringify({ role: 'user', content: 'Hello' }),
        })
        const leafId = await storage.getLeafId()
        expect(leafId).toBe('entry-1')

        await storage.appendEntry({
            id: 'entry-2',
            sessionId: 'test-session',
            parentId: 'entry-1',
            entryType: 'message',
            content: JSON.stringify({ role: 'assistant', content: 'Hi!' }),
        })
        const leafId2 = await storage.getLeafId()
        expect(leafId2).toBe('entry-2')
    })

    test('should get path to root', async () => {
        await storage.appendEntry({
            id: 'e-1',
            sessionId: 'test-session',
            parentId: null,
            entryType: 'message',
            content: JSON.stringify({ role: 'user', content: 'Q1' }),
        })
        await storage.appendEntry({
            id: 'e-2',
            sessionId: 'test-session',
            parentId: 'e-1',
            entryType: 'message',
            content: JSON.stringify({ role: 'assistant', content: 'A1' }),
        })
        await storage.appendEntry({
            id: 'e-3',
            sessionId: 'test-session',
            parentId: 'e-2',
            entryType: 'message',
            content: JSON.stringify({ role: 'user', content: 'Q2' }),
        })

        const path = await storage.getPathToRoot()
        expect(path).toHaveLength(3)
        expect(path[0].id).toBe('e-1')
        expect(path[2].id).toBe('e-3')
    })

    test('should find entries by type', async () => {
        await storage.appendEntry({
            id: 'e-1',
            sessionId: 'test-session',
            parentId: null,
            entryType: 'message',
            content: '{}',
        })
        await storage.appendEntry({
            id: 'e-2',
            sessionId: 'test-session',
            parentId: 'e-1',
            entryType: 'compaction',
            content: JSON.stringify({
                summary: 'Summary here',
                tokensBefore: 5000,
            }),
        })

        const messages = await storage.findEntries('message')
        const compactions = await storage.findEntries('compaction')

        expect(messages).toHaveLength(1)
        expect(compactions).toHaveLength(1)
        expect(compactions[0].entryType).toBe('compaction')
    })

    test('should get all entries', async () => {
        await storage.appendEntry({
            id: 'e-1',
            sessionId: 'test-session',
            parentId: null,
            entryType: 'message',
            content: '{}',
        })
        await storage.appendEntry({
            id: 'e-2',
            sessionId: 'test-session',
            parentId: 'e-1',
            entryType: 'message',
            content: '{}',
        })

        const entries = await storage.getEntries()
        expect(entries).toHaveLength(2)
    })
})
