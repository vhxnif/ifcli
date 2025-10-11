import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import Database from 'bun:sqlite'
import { DBClient } from '../src/store/db-client'
import { Store } from '../src/store/store'
import type { Model, PresetMessageContent, Cache, AppSettingContent } from '../src/store/store-types'

// Helper functions for test data
const createModel = (llmType: string, model: string): Model => ({
  llmType,
  model,
})

const createPresetMessage = (user: string, assistant: string): PresetMessageContent => ({
  user,
  assistant,
})

const createAppSetting = (content: {
  version: string
  generalSetting: string
  mcpServer: string
  llmSetting: string
}): AppSettingContent => ({
  ...content,
})

describe('Store - Integration Tests with Memory Database', () => {
  let db: Database
  let dbClient: DBClient
  let store: Store

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:')
    dbClient = new DBClient(db)
    store = new Store(dbClient)
  })

  afterEach(() => {
    db.close()
  })

  describe('Chat operations', () => {
    test('should create and retrieve chat', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      const chats = store.chat.list()

      // Assert
      expect(chatInfo).toBeDefined()
      expect(chatInfo.value.name).toBe(chatName)
      expect(chats).toHaveLength(1)
      expect(chats[0].name).toBe(chatName)
    })

    test('should switch between chats', async () => {
      // Arrange
      const chat1 = 'chat-1'
      const chat2 = 'chat-2'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chat1, async () => model)
      await store.chat.new(chat2, async () => model)

      const chat1Info = store.chat.get(chat1)
      chat1Info.switch(chat2)

      const currentChat = store.chat.get()

      // Assert
      expect(currentChat.value.name).toBe(chat2)
    })

    test('should remove chat', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.remove()

      const chats = store.chat.list()

      // Assert
      expect(chats).toHaveLength(0)
    })
  })

  describe('Configuration operations', () => {
    test('should modify system prompt', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')
      const newPrompt = 'New system prompt'

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.config.modifySystemPrompt(newPrompt)

      // Assert
      expect(chatInfo.config.value.sysPrompt).toBe(newPrompt)
    })

    test('should modify context limit', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')
      const newLimit = 20

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.config.modifyContextLimit(newLimit)

      // Assert
      expect(chatInfo.config.value.contextLimit).toBe(newLimit)
    })

    test('should toggle context', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      const initialContext = chatInfo.config.value.withContext
      chatInfo.config.moidfyContext()

      // Assert
      expect(chatInfo.config.value.withContext).toBe(initialContext === 1 ? 0 : 1)
    })

    test('should modify MCP setting', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.config.modifyMcp(true)

      // Assert
      expect(chatInfo.config.value.withMCP).toBe(1)
    })
  })

  describe('Topic operations', () => {
    test('should create and switch topics', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      const topicId = chatInfo.topic.new('test-topic')

      // Assert
      expect(topicId).toBeDefined()
      expect(chatInfo.topic.get()?.content).toBe('test-topic')
    })

    test('should list topics', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.topic.new('topic-1')
      chatInfo.topic.new('topic-2')

      const topics = chatInfo.topic.list()

      // Assert
      expect(topics).toHaveLength(2)
      expect(topics.some(t => t.content === 'topic-1')).toBe(true)
      expect(topics.some(t => t.content === 'topic-2')).toBe(true)
    })
  })

  describe('Message operations', () => {
    test('should save and retrieve messages', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      const topicId = chatInfo.topic.new('test-topic')

      const messages = [
        { topicId, role: 'user' as const, content: 'Hello', pairKey: 'pair-1' },
        { topicId, role: 'assistant' as const, content: 'Hi there', pairKey: 'pair-1' },
      ]

      chatInfo.topic.message.save(messages)
      const retrievedMessages = chatInfo.topic.message.list(topicId, 10)

      // Assert
      expect(retrievedMessages).toHaveLength(2)
      expect(retrievedMessages.some(m => m.content === 'Hello')).toBe(true)
      expect(retrievedMessages.some(m => m.content === 'Hi there')).toBe(true)
    })
  })

  describe('Preset operations', () => {
    test('should set and get preset messages', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')
      const presetMessages: PresetMessageContent[] = [
        createPresetMessage('User message 1', 'Assistant response 1'),
        createPresetMessage('User message 2', 'Assistant response 2'),
      ]

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.preset.set(presetMessages)
      const retrievedPresets = chatInfo.preset.get()

      // Assert
      expect(retrievedPresets).toHaveLength(2)
      expect(retrievedPresets[0].user).toBe('User message 1')
      expect(retrievedPresets[0].assistant).toBe('Assistant response 1')
    })

    test('should clear preset messages', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')
      const presetMessages: PresetMessageContent[] = [
        createPresetMessage('User message', 'Assistant response'),
      ]

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      chatInfo.preset.set(presetMessages)
      chatInfo.preset.clear()
      const retrievedPresets = chatInfo.preset.get()

      // Assert
      expect(retrievedPresets).toHaveLength(0)
    })
  })

  describe('Quick switch operations', () => {
    test('should manage quick switch history', () => {
      // Arrange
      const key = 'test-key'

      // Act
      store.quickSwitch.add(key)
      const history = store.quickSwitch.get(key)
      const searchResults = store.quickSwitch.list('test')

      // Assert
      expect(history).toBeDefined()
      expect(history?.key).toBe(key)
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].key).toBe(key)
    })

    test('should update quick switch frequency', () => {
      // Arrange
      const key = 'test-key'

      // Act
      store.quickSwitch.add(key)
      store.quickSwitch.update(key, 5)
      const history = store.quickSwitch.get(key)

      // Assert
      expect(history?.frequency).toBeGreaterThanOrEqual(5)
    })

    test('should delete quick switch entry', () => {
      // Arrange
      const key = 'test-key'

      // Act
      store.quickSwitch.add(key)
      store.quickSwitch.delete(key)
      const history = store.quickSwitch.get(key)

      // Assert
      expect(history).toBeNull()
    })
  })

  describe('Cache operations', () => {
    test('should manage cache entries', () => {
      // Arrange
      const cacheKey = 'test-key'
      const cacheValue = 'test-value'
      const cache: Cache = { key: cacheKey, value: cacheValue }

      // Act
      store.cache.set(cache)
      const retrievedCache = store.cache.get(cacheKey)

      store.cache.delete(cacheKey)
      const deletedCache = store.cache.get(cacheKey)

      // Assert
      expect(retrievedCache?.value).toBe(cacheValue)
      expect(deletedCache).toBeNull()
    })
  })

  describe('Prompt operations', () => {
    test('should publish and search prompts', () => {
      // Arrange
      const promptName = 'test-prompt'
      const promptVersion = '1.0'
      const promptContent = 'Test prompt content'

      // Act
      store.prompt.publish(promptName, promptVersion, promptContent)
      const prompts = store.prompt.search(promptName)
      const allPrompts = store.prompt.list()

      // Assert
      expect(prompts).toHaveLength(1)
      expect(prompts[0].name).toBe(promptName)
      expect(prompts[0].content).toBe(promptContent)
      expect(allPrompts).toHaveLength(1)
    })
  })

  describe('App setting operations', () => {
    test('should set and get app settings', () => {
      // Arrange
      const newSetting: AppSettingContent = createAppSetting({
        version: '1.0.0',
        generalSetting: JSON.stringify({ theme: 'dark' }),
        mcpServer: '[]',
        llmSetting: '[]',
      })

      // Act
      store.appSetting.set(newSetting)
      const appSetting = store.appSetting.get()

      // Assert
      expect(appSetting?.version).toBe('1.0.0')
      expect(appSetting?.generalSetting).toBe(JSON.stringify({ theme: 'dark' }))
    })
  })

  describe('Export operations', () => {
    test('should query export messages', async () => {
      // Arrange
      const chatName = 'test-chat'
      const model: Model = createModel('deepseek', 'deepseek-chat')

      // Act
      await store.chat.new(chatName, async () => model)
      const chatInfo = store.chat.get(chatName)
      const topicId = chatInfo.topic.new('test-topic')

      const messages = [
        { topicId, role: 'user' as const, content: 'Hello', pairKey: 'pair-1' },
        { topicId, role: 'assistant' as const, content: 'Hi there', pairKey: 'pair-1' },
      ]

      chatInfo.topic.message.save(messages)

      const allExports = store.exprot.all()
      const chatExports = store.exprot.chat(chatInfo.value.id)
      const topicExports = store.exprot.topic(chatInfo.value.id, topicId)

      // Assert
      expect(allExports).toBeDefined()
      expect(chatExports).toBeDefined()
      expect(topicExports).toBeDefined()
    })
  })
})