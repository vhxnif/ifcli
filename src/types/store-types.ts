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

export class Cache {
    key!: string
    value!: string
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
    existCurrentChat: () => Chat

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
    chatHistoryMessage: (chat: Chat, count: number) => ChatMessage[]
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
    modifyChatSystemPrompt: (chat: Chat, prompt: string) => void
    modifyContextLimit: (contextLimit: number) => void
    modifyChatContextLimit: (chat: Chat, contextLimit: number) => void
    modifyModel: (llm: string, model: string) => void
    modifyChatModel: (chat: Chat, llm: string, model: string) => void
    modifyWithContext: () => void
    modifyChatWithContext: (chat: Chat) => void
    modifyWithMCP: (withMCP: boolean) => void
    modifyChatWithMCP: (chat: Chat, withMCP: boolean) => void
    modifyScenario: (sc: [string, number]) => void
    modifyChatScenario: (chat: Chat, sc: [string, number]) => void
    queryChatConfig: (chatId: string) => ChatConfig

    // ---- prompt ---- //
    publishPrompt: (name: string, version: string, content: string) => void
    searchPrompt: (name: string, version?: string) => ChatPrompt[]
    listPrompt: () => ChatPrompt[]

    // ---- preset message ---- //
    createPresetMessage: (params: PresetMessageContent[]) => void
    createChatPresetMessage: (
        chat: Chat,
        params: PresetMessageContent[]
    ) => void
    selectPresetMessage: () => ChatPresetMessage[]
    selectChatPresetMessage: (chat: Chat) => ChatPresetMessage[]
    clearPresetMessage: () => void
    clearChatPresetMessage: (chat: Chat) => void
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

    // cache
    saveOrUpdateCache: (caches: Cache[]) => void
    queryCache: (keys: string[]) => Cache[]
    deleteCache: (keys: string[]) => void
}

export type RunSql = () => void

export interface IDBClient {
    init: () => void
    trans: (fs: RunSql) => void
    addChat: (name: string) => string
    addConfig: (chatId: string, model: Model) => void
    addConfigExt: (chatId: string, ext: string) => void
    addPreset: (chatId: string, contents: PresetMessageContent[]) => void
    addTopic: (chatId: string, topicId: string, content: string) => void

    selectChat: (name: string, active: boolean) => void
    unselectTopic: (chatId: string) => void
    currentChat: () => Chat | null
    currentTopic: (chatId: string) => ChatTopic | null

    queryChat: (name: string) => Chat | null
    queryConfig: (chatId: string) => ChatConfig | null
    queryConfigExt: (chatId: string) => ChatConfigExt | null
    queryPreset: (chatId: string) => ChatPresetMessage[]

    modifySystemPrompt: (configId: string, prompt: string) => void
    modifyContextLimit: (configId: string, limit: number) => void
    modifyContext: (configId: string, active: boolean) => void
    modifyMcp: (configId: string, active: boolean) => void
    modifyScenario: (configId: string, scenario: Scenario) => void
    modifyModel: (configId: string, model: Model) => void
    updateConfigExt: (chatId: string, ext: string) => void

    delPreset: (chatId: string) => void

    queryMessage: (
        topicId: string,
        limit: number,
        withReasoning?: boolean
    ) => ChatMessage[]
    saveMessage: (messages: MessageContent[]) => void
}
export type Model = {
    llmType: string
    model: string
}
export type Scenario = {
    name: string
    value: number
}

export type ConfigBo = {
    config: ChatConfig
    modifySystemPrompt: (prompt: string) => void
    modifyContextLimit: (limit: number) => void
    moidfyContext: () => void
    moidfyModel: (model: Model) => void
    modifyMcp: (active: boolean) => void
    modifyScenario: (scenario: Scenario) => void
}

export type ConfigExtBo = {
    ext: ConfigExt
    updateExt: (ext: ConfigExt) => void
}

export type PresetBo = {
    presets: () => ChatPresetMessage[]
    create: (contents: PresetMessageContent[]) => void
    clear: () => void
}

export type TopicBo = {
    topic: () => ChatTopic | null
    newTopic: (topicName: string) => string
    messages: (topicId: string, limit: number) => ChatMessage[]
    saveMessage: (messages: MessageContent[]) => void
}

export type ChatBo = {
    chat: Chat
    getConfig: () => ConfigBo
    getConfigExt: () => ConfigExtBo
    getPreset: () => PresetBo
    getTopic: () => TopicBo
}

export interface IChatStore {
    chat: (name?: string) => ChatBo
    newChat: (name: string, model: () => Promise<Model>) => Promise<void>
}
