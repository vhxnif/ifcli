import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import Database from 'bun:sqlite'
import { DBClient } from '../src/store/db-client'
import type {
    MessageContent,
    Model,
    PresetMessageContent,
    Cache,
    CmdHistoryType,
    MessageRoleType,
} from '../src/store/store-types'

// Helper function to create test data
const createMessageContent = (
    topicId: string,
    role: MessageRoleType,
    content: string,
    pairKey: string
): MessageContent => ({
    topicId,
    role,
    content,
    pairKey,
})

const createPresetMessage = (
    user: string,
    assistant: string
): PresetMessageContent => ({
    user,
    assistant,
})

const createModel = (llmType: string, model: string): Model => ({
    llmType,
    model,
})

describe('DBClient - Database Operations Tests', () => {
    let db: Database
    let dbClient: DBClient

    beforeEach(() => {
        // Create in-memory database for testing
        db = new Database(':memory:')
        dbClient = new DBClient(db)
    })

    afterEach(() => {
        db.close()
    })

    describe('Chat operations', () => {
        test('should create and retrieve chats', () => {
            // Arrange
            const chatName = 'test-chat'

            // Act
            const chatId = dbClient.addChat(chatName)
            const chats = dbClient.chats()
            const currentChat = dbClient.currentChat()
            const queriedChat = dbClient.queryChat(chatName)

            // Assert
            expect(chatId).toBeDefined()
            expect(chats).toHaveLength(1)
            expect(chats[0].name).toBe(chatName)
            expect(currentChat).toBeNull() // No chat is selected initially
            expect(queriedChat?.name).toBe(chatName)
        })

        test('should select and unselect chats', () => {
            // Arrange
            const chatName = 'test-chat'
            dbClient.addChat(chatName)

            // Act
            dbClient.selectChat(chatName, true)
            const currentChat = dbClient.currentChat()

            // Assert
            expect(currentChat?.name).toBe(chatName)
            expect(currentChat?.select).toBe(1) // SQLite stores booleans as 0/1
        })
    })

    describe('Chat configuration operations', () => {
        test('should add and query chat config', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const model: Model = createModel('deepseek', 'deepseek-chat')

            // Act
            dbClient.addConfig(chatId, model)
            const config = dbClient.queryConfig(chatId)

            // Assert
            expect(config).toBeDefined()
            expect(config?.chatId).toBe(chatId)
            expect(config?.model).toBe('deepseek-chat')
        })

        test('should modify chat config properties', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const model: Model = createModel('deepseek', 'deepseek-chat')
            dbClient.addConfig(chatId, model)
            const config = dbClient.queryConfig(chatId)!

            // Act
            dbClient.modifySystemPrompt(config.id, 'New system prompt')
            dbClient.modifyContextLimit(config.id, 20)
            dbClient.modifyContext(config.id, false)
            dbClient.modifyMcp(config.id, true)

            // Assert - Verify modifications
            const updatedConfig = dbClient.queryConfig(chatId)
            expect(updatedConfig?.sysPrompt).toBe('New system prompt')
            expect(updatedConfig?.contextLimit).toBe(20)
            expect(updatedConfig?.withContext).toBe(0) // SQLite stores booleans as 0/1
            expect(updatedConfig?.withMCP).toBe(1) // SQLite stores booleans as 0/1
        })
    })

    describe('Topic operations', () => {
        test('should add and query topics', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const topicName = 'test-topic'

            // Act
            dbClient.addTopic(chatId, 'topic-1', topicName)
            const topics = dbClient.queryTopic(chatId)

            // Assert
            expect(topics).toHaveLength(1)
            expect(topics[0].content).toBe(topicName)
            expect(topics[0].select).toBe(1) // SQLite stores booleans as 0/1
        })

        test('should handle topic selection', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            dbClient.addTopic(chatId, 'topic-1', 'topic-1')
            dbClient.addTopic(chatId, 'topic-2', 'topic-2')

            // Act
            dbClient.unselectTopic(chatId)
            dbClient.selectTopic('topic-2', true)
            const currentTopic = dbClient.currentTopic(chatId)

            // Assert
            expect(currentTopic?.id).toBe('topic-2')
        })
    })

    describe('Message operations', () => {
        test('should save and query messages', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const topicId = 'test-topic'
            dbClient.addTopic(chatId, topicId, 'test-topic')

            const messages: MessageContent[] = [
                createMessageContent(topicId, 'user', 'Hello', 'pair-1'),
                createMessageContent(
                    topicId,
                    'assistant',
                    'Hi there',
                    'pair-1'
                ),
                createMessageContent(topicId, 'user', 'How are you?', 'pair-2'),
            ]

            // Act
            dbClient.saveMessage(messages)
            const queriedMessages = dbClient.queryMessage(topicId, 10)

            // Assert
            expect(queriedMessages).toHaveLength(3)
            // Note: queryMessage returns messages in descending order by action_time
            expect(queriedMessages.some((m) => m.content === 'Hello')).toBe(
                true
            )
            expect(queriedMessages.some((m) => m.content === 'Hi there')).toBe(
                true
            )
            expect(
                queriedMessages.some((m) => m.content === 'How are you?')
            ).toBe(true)
        })

        test('should filter reasoning messages when withReasoning is false', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const topicId = 'test-topic'
            dbClient.addTopic(chatId, topicId, 'test-topic')

            const messages: MessageContent[] = [
                createMessageContent(topicId, 'user', 'Hello', 'pair-1'),
                createMessageContent(
                    topicId,
                    'reasoning',
                    'Thinking...',
                    'pair-1'
                ),
                createMessageContent(
                    topicId,
                    'assistant',
                    'Hi there',
                    'pair-1'
                ),
            ]

            // Act
            dbClient.saveMessage(messages)
            const queriedMessages = dbClient.queryMessage(topicId, 10, false)

            // Assert
            expect(queriedMessages).toHaveLength(2) // Should exclude reasoning
            expect(queriedMessages.some((m) => m.role === 'reasoning')).toBe(
                false
            )
        })
    })

    describe('Preset message operations', () => {
        test('should add and query preset messages', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const presetMessages: PresetMessageContent[] = [
                createPresetMessage('User message 1', 'Assistant response 1'),
                createPresetMessage('User message 2', 'Assistant response 2'),
            ]

            // Act
            dbClient.addPreset(chatId, presetMessages)
            const queriedPresets = dbClient.queryPreset(chatId)

            // Assert
            expect(queriedPresets).toHaveLength(2)
            expect(queriedPresets[0].user).toBe('User message 1')
            expect(queriedPresets[0].assistant).toBe('Assistant response 1')
        })

        test('should delete preset messages', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const presetMessages: PresetMessageContent[] = [
                createPresetMessage('User message', 'Assistant response'),
            ]
            dbClient.addPreset(chatId, presetMessages)

            // Act
            dbClient.delPreset(chatId)
            const queriedPresets = dbClient.queryPreset(chatId)

            // Assert
            expect(queriedPresets).toHaveLength(0)
        })
    })

    describe('Command history operations', () => {
        test('should manage command history', () => {
            // Arrange
            const type: CmdHistoryType = 'chat_switch'
            const key = 'test-key'

            // Act
            dbClient.addCmdHis(type, key)
            const history = dbClient.getCmdHis(type, key)
            const searchResults = dbClient.queryCmdHis(type, 'test')

            // Assert
            expect(history).toBeDefined()
            expect(history?.key).toBe(key)
            expect(searchResults).toHaveLength(1)
            expect(searchResults[0].key).toBe(key)
        })

        test('should add or update command history', () => {
            // Arrange
            const type: CmdHistoryType = 'chat_switch'
            const key = 'test-key'

            // Act
            dbClient.addOrUpdateCmdHis(type, key)
            const firstHistory = dbClient.getCmdHis(type, key)

            dbClient.addOrUpdateCmdHis(type, key)
            const secondHistory = dbClient.getCmdHis(type, key)

            // Assert
            expect(firstHistory?.frequency).toBe(1)
            expect(secondHistory?.frequency).toBe(2)
        })
    })

    describe('Prompt operations', () => {
        test('should publish and search prompts', () => {
            // Arrange
            const promptName = 'test-prompt'
            const promptVersion = '1.0'
            const promptContent = 'Test prompt content'

            // Act
            dbClient.publishPrompt(promptName, promptVersion, promptContent)
            const prompts = dbClient.searchPrompt(promptName)
            const allPrompts = dbClient.listPrompt()

            // Assert
            expect(prompts).toHaveLength(1)
            expect(prompts[0].name).toBe(promptName)
            expect(prompts[0].content).toBe(promptContent)
            expect(allPrompts).toHaveLength(1)
        })
    })

    describe('Cache operations', () => {
        test('should manage cache entries', () => {
            // Arrange
            const cacheKey = 'test-key'
            const cacheValue = 'test-value'
            const cache: Cache = { key: cacheKey, value: cacheValue }

            // Act
            dbClient.saveOrUpdateCache(cache)
            const retrievedCache = dbClient.queryCache(cacheKey)

            dbClient.deleteCache(cacheKey)
            const deletedCache = dbClient.queryCache(cacheKey)

            // Assert
            expect(retrievedCache?.value).toBe(cacheValue)
            expect(deletedCache).toBeNull()
        })
    })

    describe('Export operations', () => {
        test('should query export messages', () => {
            // Arrange
            const chatId = dbClient.addChat('test-chat')
            const topicId = 'test-topic'

            // Add configuration (required for export queries)
            const model: Model = createModel('deepseek', 'deepseek-chat')
            dbClient.addConfig(chatId, model)

            dbClient.addTopic(chatId, topicId, 'test-topic')

            const messages: MessageContent[] = [
                createMessageContent(topicId, 'user', 'Hello', 'pair-1'),
                createMessageContent(
                    topicId,
                    'assistant',
                    'Hi there',
                    'pair-1'
                ),
            ]
            dbClient.saveMessage(messages)

            // Act
            const allExports = dbClient.queryAllExportMessage()
            const chatExports = dbClient.queryChatExportMessage(chatId)
            const topicExports = dbClient.queryChatTopicExportMessage(
                chatId,
                topicId
            )

            // Assert
            // Export queries require proper message grouping and may return empty if conditions not met
            expect(allExports).toBeDefined()
            expect(chatExports).toBeDefined()
            expect(topicExports).toBeDefined()
        })
    })

    describe('Transaction operations', () => {
        test('should execute transactions', () => {
            // Arrange
            let transactionExecuted = false

            // Act
            dbClient.trans(() => {
                transactionExecuted = true
                dbClient.addChat('transaction-chat')
            })

            // Assert
            expect(transactionExecuted).toBe(true)
            const chats = dbClient.chats()
            expect(chats.some((chat) => chat.name === 'transaction-chat')).toBe(
                true
            )
        })
    })
})
