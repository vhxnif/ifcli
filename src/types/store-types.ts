export class SqliteTable {
    name!: string
}

export class Chat {
    id!: string
    name!: string
    select!: boolean
    actionTime!: bigint
    selectTime!: bigint
}

export class ChatTopic {
    id!: string
    chatId!: string
    content!: string
    select!: boolean
    selectTime!: bigint
    createTime!: bigint
}

export class ChatMessage {
    id!: string
    topicId!: string
    role!: string
    content!: string
    pairKey!: string
    actionTime!: bigint
}

export class ChatConfig {
    id!: string
    chatId!: string
    sysPrompt!: string
    withContext!: boolean
    withMCP!: boolean
    contextLimit!: number
    llmType!: string
    model!: string
    scenarioName!: string
    scenario!: number
    updateTime!: bigint
}

export class ChatConfigExt {
    id!: string
    chat_id!: string
    ext!: string
    createTime!: string
    updateTime!: string
}

export class ChatPrompt {
    name!: string
    version!: string
    role!: string
    content!: string
    modifyTime!: bigint
}

export class ChatPresetMessage {
    id!: string
    chatId!: string
    user!: string
    assistant!: string
    create_time!: bigint
}

export class AppSetting {
    id!: string
    version!: string
    generalSetting!: string
    mcpServer!: string
    llmSetting!: string
    createTime!: bigint
}

export type CmdHistoryType = 'chat_switch'

export class CmdHistory {
    id!: string
    type!: CmdHistoryType
    key!: string
    lastSwitchTime!: number
    frequency!: number
}

export type MessageContent = {
    topicId: string
    role: 'user' | 'assistant' | 'reasoning' | 'toolscall'
    content: string
    pairKey: string
}

export type PresetMessageContent = {
    user: string
    assistant: string
}

export type AppSettingContent = {
    version: string
    generalSetting: string
    mcpServer: string
    llmSetting: string
}

export class ExportMessage {
    chatName!: string
    topicName!: string | undefined
    user!: string
    reasoning!: string | undefined
    assistant!: string
    actionTime!: string
}

export type MCPServerKey = {
    name: string
    version: string
}

export type ConfigExt = {
    mcpServers: MCPServerKey[]
}

export interface IStore {
    init: () => void
    // ---- chat ---- //
    chats: () => Chat[]
    queryChat: (name: string) => Chat | null
    newChat: (
        name: string,
        prompt: string,
        llmType: string,
        model: string
    ) => void
    removeChat: (name: string) => void
    changeChat: (name: string) => void
    currentChat: () => Chat | null

    // ---- topic ---- //
    selectedTopic: (chatId: string) => ChatTopic | null
    createTopic: (chatId: string, content: string) => string
    currentChatTopics: () => ChatTopic[]
    changeTopic: (topicId: string, chatId: string) => void
    queryTopic: (chatId: string) => ChatTopic[]

    // ---- message ---- //
    saveMessage: (messages: MessageContent[]) => void
    contextMessage: (topicId: string, limit: number) => ChatMessage[]
    historyMessage: (count: number) => ChatMessage[]
    selectMessage: (messageId: string) => ChatMessage
    queryAllExportMessage: () => ExportMessage[]
    queryChatExportMessage: (chatId: string) => ExportMessage[]
    queryChatTopicExportMessage: (
        chatId: string,
        topicId: string
    ) => ExportMessage[]

    // ---- config ---- //
    currentChatConfig: () => ChatConfig
    modifySystemPrompt: (prompt: string) => void
    modifyContextLimit: (contextLimit: number) => void
    modifyModel: (llm: string, model: string) => void
    modifyWithContext: () => void
    modifyWithMCP: (withMCP: boolean) => void
    modifyScenario: (sc: [string, number]) => void
    queryChatConfig: (chatId: string) => ChatConfig

    // ---- prompt ---- //
    publishPrompt: (name: string, version: string, content: string) => void
    searchPrompt: (name: string, version?: string) => ChatPrompt[]
    listPrompt: () => ChatPrompt[]

    // ---- preset message ---- //
    createPresetMessage: (params: PresetMessageContent[]) => void
    selectPresetMessage: () => ChatPresetMessage[]
    clearPresetMessage: () => void
    // ---- app setting ----
    appSetting: () => AppSetting | null
    addAppSetting: (setting: AppSettingContent) => void

    // ---- cmd his ----
    queryCmdHis: (type: CmdHistoryType, key: string) => CmdHistory[]
    addCmdHis: (type: CmdHistoryType, key: string) => void
    getCmdHis: (type: CmdHistoryType, key: string) => CmdHistory | null
    delCmdHis: (type: CmdHistoryType, key: string) => void
    updateCmdHis: (type: CmdHistoryType, key: string, frequency: number) => void
    addOrUpdateCmdHis: (type: CmdHistoryType, key: string) => void

    // chat config ext
    saveChatCofnigExt: (chatId: string, ext: string) => void
    updateChatConfigExt: (chatId: string, ext: string) => void
    queryChatConfigExt: (chatId: string) => ChatConfigExt | null
}
