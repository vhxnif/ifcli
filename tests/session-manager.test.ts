/**
 * 测试 SessionManager — 多 session 管理。
 */

import Database from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { SessionManager } from '../src/store/session-manager'

describe('SessionManager', () => {
    let db: Database
    let manager: SessionManager

    beforeEach(() => {
        db = new Database(':memory:')
        manager = new SessionManager(db)
    })

    afterEach(() => {
        db.close()
    })

    test('should create and list sessions', () => {
        manager.create('Chat 1', 'deepseek/deepseek-chat', 'off')
        manager.create('Chat 2', 'openai/gpt-4o', 'medium')

        const sessions = manager.list()
        expect(sessions).toHaveLength(2)
        const names = sessions.map((s) => s.name).sort()
        expect(names).toEqual(['Chat 1', 'Chat 2'])
    })

    test('should get session handle and read metadata', async () => {
        const info = manager.create('Test', 'deepseek/deepseek-chat', 'high')
        const handle = manager.get(info.id)
        const meta = await handle.storage.getMetadata()

        expect(meta.name).toBe('Test')
        expect(meta.thinkingLevel).toBe('high')
        expect(meta.model).toBe('deepseek/deepseek-chat')
        expect(meta.thinkingLevel).toBe('high')
    })

    test('should update session metadata via handle', async () => {
        const info = manager.create('Test', 'deepseek/deepseek-chat')
        const handle = manager.get(info.id)

        await handle.updateMeta({ name: 'Renamed', thinkingLevel: 'max' })
        const meta = await handle.storage.getMetadata()

        expect(meta.name).toBe('Renamed')
        expect(meta.thinkingLevel).toBe('max')
    })

    test('should append messages via handle', async () => {
        const info = manager.create('Test', 'deepseek/deepseek-chat')
        const handle = manager.get(info.id)

        await handle.appendMessage({
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
        } as any)
        await handle.appendMessage({
            role: 'assistant',
            content: [{ type: 'text', text: 'Hi there!' }],
            api: 'openai-completions',
            provider: 'openai',
            model: 'gpt-4o',
            timestamp: Date.now(),
        } as any)

        const entries = await handle.storage.getEntries()
        const messages = entries.filter((e) => e.entryType === 'message')
        expect(messages).toHaveLength(2)
    })

    test('should delete session', () => {
        const info = manager.create('Test', 'deepseek/deepseek-chat')
        manager.delete(info.id)
        const sessions = manager.list()
        expect(sessions).toHaveLength(0)
    })

    test('should build context from session entries', async () => {
        const info = manager.create('Test', 'deepseek/deepseek-chat')
        const handle = manager.get(info.id)
        await handle.updateMeta({ systemPrompt: 'You are helpful.' })

        await handle.appendMessage({
            role: 'user',
            content: 'Q1',
            timestamp: Date.now(),
        } as any)
        await handle.appendMessage({
            role: 'assistant',
            content: [{ type: 'text', text: 'A1' }],
            api: 'openai-completions',
            provider: 'openai',
            model: 'gpt-4o',
            timestamp: Date.now(),
        } as any)

        const ctx = await handle.buildContext()
        expect(ctx.systemPrompt).toBe('You are helpful.')
        expect(ctx.messages).toHaveLength(2)
        expect(ctx.messages[0].role).toBe('user')
        expect(ctx.messages[1].role).toBe('assistant')
    })
})
