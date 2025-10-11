import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { Store } from '../src/store/store'
import type { IDBClient } from '../src/store/store-types'

// Mock DBClient to avoid complex database operations
const createMockDBClient = (): IDBClient => {
    const mockClient = {
        init: mock(() => {}),
        chats: mock(() => []),
        addChat: mock((name: string) => `chat-${name}`),
        queryChat: mock((name: string) => ({
            id: `chat-${name}`,
            name,
            select: 0,
            actionTime: BigInt(Date.now()),
            selectTime: BigInt(Date.now()),
        })),
        currentChat: mock(() => null),
        selectChat: mock(() => {}),
        addConfig: mock(() => {}),
        addConfigExt: mock(() => {}),
        queryConfig: mock((chatId: string) => ({
            id: `config-${chatId}`,
            chatId,
            sysPrompt: '',
            withContext: 1,
            withMCP: 0,
            contextLimit: 10,
            llmType: 'deepseek',
            model: 'deepseek-chat',
            scenarioName: 'general',
            scenario: 0.7,
            updateTime: BigInt(Date.now()),
        })),
        queryConfigExt: mock((chatId: string) => ({
            id: `config-ext-${chatId}`,
            chatId,
            ext: JSON.stringify({ mcpServers: [] }),
            createTime: BigInt(Date.now()),
            updateTime: BigInt(Date.now()),
        })),
        modifySystemPrompt: mock(() => {}),
        modifyContextLimit: mock(() => {}),
        modifyContext: mock(() => {}),
        modifyMcp: mock(() => {}),
        modifyScenario: mock(() => {}),
        modifyModel: mock(() => {}),
        updateConfigExt: mock(() => {}),
        addPreset: mock(() => {}),
        queryPreset: mock(() => []),
        delPreset: mock(() => {}),
        addTopic: mock(() => {}),
        queryTopic: mock(() => []),
        currentTopic: mock(() => null),
        unselectTopic: mock(() => {}),
        selectTopic: mock(() => {}),
        queryMessage: mock(() => []),
        saveMessage: mock(() => {}),
        delChat: mock(() => {}),
        delConfig: mock(() => {}),
        delConfigExt: mock(() => {}),
        delChatTopic: mock(() => {}),
        delMessage: mock(() => {}),
        queryCmdHis: mock(() => []),
        getCmdHis: mock(() => null),
        addCmdHis: mock(() => {}),
        delCmdHis: mock(() => {}),
        updateCmdHis: mock(() => {}),
        addOrUpdateCmdHis: mock(() => {}),
        publishPrompt: mock(() => {}),
        searchPrompt: mock(() => []),
        listPrompt: mock(() => []),
        deletePrompt: mock(() => []),
        queryAllExportMessage: mock(() => []),
        queryChatExportMessage: mock(() => []),
        queryChatTopicExportMessage: mock(() => []),
        queryCache: mock(() => null),
        saveOrUpdateCache: mock(() => {}),
        deleteCache: mock(() => {}),
        appSetting: mock(() => ({
            id: 'setting-1',
            version: '1.0.0',
            generalSetting: JSON.stringify({ theme: 'dark' }),
            mcpServer: '[]',
            llmSetting: '[]',
            createTime: BigInt(Date.now()),
        })),
        addAppSetting: mock(() => {}),
        trans: mock((fn: () => void) => fn()),
    }

    return mockClient
}

describe('Store - Simple Business Logic Tests', () => {
    let store: Store
    let mockDBClient: IDBClient

    beforeEach(() => {
        mockDBClient = createMockDBClient()
        store = new Store(mockDBClient)
    })

    describe('Property accessors', () => {
        test('should provide chat accessor', () => {
            // Act
            const chatAct = store.chat

            // Assert
            expect(chatAct).toBeDefined()
            expect(chatAct.get).toBeDefined()
            expect(chatAct.list).toBeDefined()
            expect(chatAct.new).toBeDefined()
        })

        test('should provide quickSwitch accessor', () => {
            // Act
            const quickSwitch = store.quickSwitch

            // Assert
            expect(quickSwitch).toBeDefined()
            expect(quickSwitch.list).toBeDefined()
            expect(quickSwitch.add).toBeDefined()
            expect(quickSwitch.get).toBeDefined()
            expect(quickSwitch.delete).toBeDefined()
            expect(quickSwitch.update).toBeDefined()
            expect(quickSwitch.saveOrUpdate).toBeDefined()
        })

        test('should provide export accessor', () => {
            // Act
            const exportAct = store.exprot

            // Assert
            expect(exportAct).toBeDefined()
            expect(exportAct.all).toBeDefined()
            expect(exportAct.chat).toBeDefined()
            expect(exportAct.topic).toBeDefined()
        })

        test('should provide cache accessor', () => {
            // Act
            const cache = store.cache

            // Assert
            expect(cache).toBeDefined()
            expect(cache.get).toBeDefined()
            expect(cache.delete).toBeDefined()
            expect(cache.set).toBeDefined()
        })

        test('should provide prompt accessor', () => {
            // Act
            const prompt = store.prompt

            // Assert
            expect(prompt).toBeDefined()
            expect(prompt.list).toBeDefined()
            expect(prompt.search).toBeDefined()
            expect(prompt.publish).toBeDefined()
        })

        test('should provide appSetting accessor', () => {
            // Act
            const appSetting = store.appSetting

            // Assert
            expect(appSetting).toBeDefined()
            expect(appSetting.get).toBeDefined()
            expect(appSetting.set).toBeDefined()
        })
    })

    describe('Quick switch operations', () => {
        test('should delegate list to DBClient', () => {
            // Arrange
            const mockQueryCmdHis = mockDBClient.queryCmdHis as ReturnType<
                typeof mock
            >
            mockQueryCmdHis.mockReturnValue([
                {
                    id: '1',
                    type: 'chat_switch',
                    key: 'test',
                    lastSwitchTime: BigInt(Date.now()),
                    frequency: 1,
                },
            ])

            // Act
            const result = store.quickSwitch.list('test')

            // Assert
            expect(mockQueryCmdHis).toHaveBeenCalledWith('chat_switch', 'test')
            expect(result).toHaveLength(1)
        })

        test('should delegate add to DBClient', () => {
            // Arrange
            const mockAddCmdHis = mockDBClient.addCmdHis

            // Act
            store.quickSwitch.add('test-key')

            // Assert
            expect(mockAddCmdHis).toHaveBeenCalledWith(
                'chat_switch',
                'test-key'
            )
        })

        test('should delegate get to DBClient', () => {
            // Arrange
            const mockGetCmdHis = mockDBClient.getCmdHis as ReturnType<
                typeof mock
            >
            mockGetCmdHis.mockReturnValue({
                id: '1',
                type: 'chat_switch',
                key: 'test',
                lastSwitchTime: BigInt(Date.now()),
                frequency: 1,
            })

            // Act
            const result = store.quickSwitch.get('test')

            // Assert
            expect(mockGetCmdHis).toHaveBeenCalledWith('chat_switch', 'test')
            expect(result).toBeDefined()
        })

        test('should delegate delete to DBClient', () => {
            // Arrange
            const mockDelCmdHis = mockDBClient.delCmdHis

            // Act
            store.quickSwitch.delete('test-key')

            // Assert
            expect(mockDelCmdHis).toHaveBeenCalledWith(
                'chat_switch',
                'test-key'
            )
        })

        test('should delegate update to DBClient', () => {
            // Arrange
            const mockUpdateCmdHis = mockDBClient.updateCmdHis

            // Act
            store.quickSwitch.update('test-key', 5)

            // Assert
            expect(mockUpdateCmdHis).toHaveBeenCalledWith(
                'chat_switch',
                'test-key',
                5
            )
        })

        test('should delegate saveOrUpdate to DBClient', () => {
            // Arrange
            const mockAddOrUpdateCmdHis = mockDBClient.addOrUpdateCmdHis

            // Act
            store.quickSwitch.saveOrUpdate('test-key')

            // Assert
            expect(mockAddOrUpdateCmdHis).toHaveBeenCalledWith(
                'chat_switch',
                'test-key'
            )
        })
    })

    describe('Cache operations', () => {
        test('should delegate get to DBClient', () => {
            // Arrange
            const mockQueryCache = mockDBClient.queryCache as ReturnType<
                typeof mock
            >
            mockQueryCache.mockReturnValue({ key: 'test', value: 'test-value' })

            // Act
            const result = store.cache.get('test')

            // Assert
            expect(mockQueryCache).toHaveBeenCalledWith('test')
            expect(result).toBeDefined()
        })

        test('should delegate delete to DBClient', () => {
            // Arrange
            const mockDeleteCache = mockDBClient.deleteCache

            // Act
            store.cache.delete('test-key')

            // Assert
            expect(mockDeleteCache).toHaveBeenCalledWith('test-key')
        })

        test('should delegate set to DBClient', () => {
            // Arrange
            const mockSaveOrUpdateCache = mockDBClient.saveOrUpdateCache

            // Act
            store.cache.set({ key: 'test', value: 'test-value' })

            // Assert
            expect(mockSaveOrUpdateCache).toHaveBeenCalledWith({
                key: 'test',
                value: 'test-value',
            })
        })
    })

    describe('Prompt operations', () => {
        test('should delegate list to DBClient', () => {
            // Arrange
            const mockListPrompt = mockDBClient.listPrompt as ReturnType<
                typeof mock
            >
            mockListPrompt.mockReturnValue([
                {
                    name: 'test',
                    version: '1.0',
                    role: 'system',
                    content: 'test content',
                    modifyTime: BigInt(Date.now()),
                },
            ])

            // Act
            const result = store.prompt.list()

            // Assert
            expect(mockListPrompt).toHaveBeenCalled()
            expect(result).toHaveLength(1)
        })

        test('should delegate search to DBClient', () => {
            // Arrange
            const mockSearchPrompt = mockDBClient.searchPrompt as ReturnType<
                typeof mock
            >
            mockSearchPrompt.mockReturnValue([
                {
                    name: 'test',
                    version: '1.0',
                    role: 'system',
                    content: 'test content',
                    modifyTime: BigInt(Date.now()),
                },
            ])

            // Act
            const result = store.prompt.search('test')

            // Assert
            expect(mockSearchPrompt).toHaveBeenCalledWith('test', undefined)
            expect(result).toHaveLength(1)
        })

        test('should delegate publish to DBClient', () => {
            // Arrange
            const mockPublishPrompt = mockDBClient.publishPrompt

            // Act
            store.prompt.publish('test', '1.0', 'test content')

            // Assert
            expect(mockPublishPrompt).toHaveBeenCalledWith(
                'test',
                '1.0',
                'test content'
            )
        })
    })

    describe('App setting operations', () => {
        test('should delegate get to DBClient', () => {
            // Arrange
            const mockAppSetting = mockDBClient.appSetting

            // Act
            const result = store.appSetting.get()

            // Assert
            expect(mockAppSetting).toHaveBeenCalled()
            expect(result).toBeDefined()
        })

        test('should delegate set to DBClient', () => {
            // Arrange
            const mockAddAppSetting = mockDBClient.addAppSetting
            const setting = {
                version: '1.0.0',
                generalSetting: JSON.stringify({ theme: 'dark' }),
                mcpServer: '[]',
                llmSetting: '[]',
            }

            // Act
            store.appSetting.set(setting)

            // Assert
            expect(mockAddAppSetting).toHaveBeenCalledWith(setting)
        })
    })

    describe('Export operations', () => {
        test('should delegate all to DBClient', () => {
            // Arrange
            const mockQueryAllExportMessage =
                mockDBClient.queryAllExportMessage as ReturnType<typeof mock>
            mockQueryAllExportMessage.mockReturnValue([
                {
                    chatName: 'test',
                    topicName: 'topic',
                    user: 'hello',
                    reasoning: null,
                    assistant: 'hi',
                    actionTime: '2024-01-01',
                },
            ])

            // Act
            const result = store.exprot.all()

            // Assert
            expect(mockQueryAllExportMessage).toHaveBeenCalled()
            expect(result).toHaveLength(1)
        })

        test('should delegate chat to DBClient', () => {
            // Arrange
            const mockQueryChatExportMessage =
                mockDBClient.queryChatExportMessage as ReturnType<typeof mock>
            mockQueryChatExportMessage.mockReturnValue([
                {
                    chatName: 'test',
                    topicName: 'topic',
                    user: 'hello',
                    reasoning: null,
                    assistant: 'hi',
                    actionTime: '2024-01-01',
                },
            ])

            // Act
            const result = store.exprot.chat('chat-1')

            // Assert
            expect(mockQueryChatExportMessage).toHaveBeenCalledWith('chat-1')
            expect(result).toHaveLength(1)
        })

        test('should delegate topic to DBClient', () => {
            // Arrange
            const mockQueryChatTopicExportMessage =
                mockDBClient.queryChatTopicExportMessage as ReturnType<
                    typeof mock
                >
            mockQueryChatTopicExportMessage.mockReturnValue([
                {
                    chatName: 'test',
                    topicName: 'topic',
                    user: 'hello',
                    reasoning: null,
                    assistant: 'hi',
                    actionTime: '2024-01-01',
                },
            ])

            // Act
            const result = store.exprot.topic('chat-1', 'topic-1')

            // Assert
            expect(mockQueryChatTopicExportMessage).toHaveBeenCalledWith(
                'chat-1',
                'topic-1'
            )
            expect(result).toHaveLength(1)
        })
    })
})
