/**
 * 测试 AgentManager — agent/session 两层管理。
 */

import Database from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { AgentManager } from '../src/store/agent-manager'

describe('AgentManager', () => {
    let db: Database
    let manager: AgentManager

    beforeEach(() => {
        db = new Database(':memory:')
        manager = new AgentManager(db)
    })

    afterEach(() => {
        db.close()
    })

    test('should create and list agents', () => {
        manager.createAgent('Agent 1', {
            model: 'deepseek/deepseek-chat',
            thinkingLevel: 'off',
        })
        manager.createAgent('Agent 2', {
            model: 'openai/gpt-4o',
            thinkingLevel: 'medium',
        })

        const agents = manager.listAgents()
        expect(agents).toHaveLength(2)
        const names = agents.map((a) => a.name).sort()
        expect(names).toEqual(['Agent 1', 'Agent 2'])
    })

    test('should create session under agent', () => {
        const agent = manager.createAgent('Agent 1', {
            model: 'deepseek/deepseek-chat',
        })
        const session = manager.createSession(agent.id, 'Topic 1')

        expect(session.agentId).toBe(agent.id)
        const sessions = manager.listSessions(agent.id)
        expect(sessions).toHaveLength(1)
        expect(sessions[0].name).toBe('Topic 1')
    })

    test('should get agent handle and read metadata', async () => {
        const info = manager.createAgent('Test', {
            model: 'deepseek/deepseek-chat',
            thinkingLevel: 'high',
            systemPrompt: 'You are helpful.',
        })
        const handle = manager.getAgent(info.id)
        const meta = await handle.info

        expect(meta.name).toBe('Test')
        expect(meta.thinkingLevel).toBe('high')
        expect(meta.model).toBe('deepseek/deepseek-chat')
        expect(meta.systemPrompt).toBe('You are helpful.')
    })

    test('should update agent metadata via handle', async () => {
        const info = manager.createAgent('Test', {
            model: 'deepseek/deepseek-chat',
        })
        const handle = manager.getAgent(info.id)

        await handle.update({ name: 'Renamed', thinkingLevel: 'max' })
        const meta = await handle.info

        expect(meta.name).toBe('Renamed')
        expect(meta.thinkingLevel).toBe('max')
    })

    test('should append messages via session handle', async () => {
        const agent = manager.createAgent('Test', {
            model: 'deepseek/deepseek-chat',
        })
        const session = manager.createSession(agent.id, 'Topic')
        const handle = manager.getSession(session.id)

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

    test('should delete agent and its sessions', () => {
        const agent = manager.createAgent('Test', {
            model: 'deepseek/deepseek-chat',
        })
        manager.createSession(agent.id, 'Topic')
        manager.deleteAgent(agent.id)

        expect(manager.listAgents()).toHaveLength(0)
        expect(manager.listSessions(agent.id)).toHaveLength(0)
    })

    test('should build context from session entries using agent system prompt', async () => {
        const agent = manager.createAgent('Test', {
            model: 'deepseek/deepseek-chat',
            systemPrompt: 'You are helpful.',
        })
        const session = manager.createSession(agent.id, 'Topic')
        const handle = manager.getSession(session.id)

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
