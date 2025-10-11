export class SqliteTable {
    name!: string
}

export class Chat {
    id!: string
    name!: string
    select!: number // SQLite stores booleans as 0/1
    actionTime!: bigint
    selectTime!: bigint
}

export class ChatTopic {
    id!: string
    chatId!: string
    content!: string
    select!: number // SQLite stores booleans as 0/1
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
    withContext!: number // SQLite stores booleans as 0/1
    withMCP!: number // SQLite stores booleans as 0/1
    contextLimit!: number
    llmType!: string
    model!: string
    scenarioName!: string
    scenario!: number
    updateTime!: bigint
}

export class ChatConfigExt {
    id!: string
    chatId!: string
    ext!: string
    createTime!: bigint
    updateTime!: bigint
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

export type MessageRoleType = 'user' | 'assistant' | 'reasoning' | 'toolscall'

export type MessageContent = {
    topicId: string
    role: MessageRoleType
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

export type RunSql = () => void

export interface IDBClient {
    init: () => void
    trans: (fs: RunSql) => void

    // chat
    chats: () => Chat[]
    addChat: (name: string) => string
    selectChat: (name: string, active: boolean) => void
    currentChat: () => Chat | null
    queryChat: (name: string) => Chat | null
    delChat: (chatId: string) => void

    // config
    queryConfig: (chatId: string) => ChatConfig | null
    addConfig: (chatId: string, model: Model) => void
    delConfig: (chatId: string) => void
    modifySystemPrompt: (configId: string, prompt: string) => void
    modifyContextLimit: (configId: string, limit: number) => void
    modifyContext: (configId: string, active: boolean) => void
    modifyMcp: (configId: string, active: boolean) => void
    modifyScenario: (configId: string, scenario: Scenario) => void
    modifyModel: (configId: string, model: Model) => void

    // ext
    addConfigExt: (chatId: string, ext: string) => void
    queryConfigExt: (chatId: string) => ChatConfigExt | null
    updateConfigExt: (chatId: string, ext: string) => void
    delConfigExt: (chatId: string) => void

    // preset
    addPreset: (chatId: string, contents: PresetMessageContent[]) => void
    queryPreset: (chatId: string) => ChatPresetMessage[]
    delPreset: (chatId: string) => void

    // topic
    addTopic: (chatId: string, topicId: string, content: string) => void
    unselectTopic: (chatId: string) => void
    currentTopic: (chatId: string) => ChatTopic | null
    selectTopic: (topicId: string, active: boolean) => void
    queryTopic: (chatId: string) => ChatTopic[]
    delChatTopic: (chatId: string) => void

    // message
    delMessage: (topicId: string) => void
    queryMessage: (
        topicId: string,
        limit: number,
        withReasoning?: boolean
    ) => ChatMessage[]
    saveMessage: (messages: MessageContent[]) => void
    queryAllExportMessage: () => ExportMessage[]
    queryChatExportMessage: (chatId: string) => ExportMessage[]
    queryChatTopicExportMessage: (
        chatId: string,
        topicId: string
    ) => ExportMessage[]

    // quick cmd
    queryCmdHis: (type: CmdHistoryType, key: string) => CmdHistory[]
    addCmdHis: (type: CmdHistoryType, key: string) => void
    getCmdHis: (type: CmdHistoryType, key: string) => CmdHistory | null
    delCmdHis: (type: CmdHistoryType, key: string) => void
    updateCmdHis: (type: CmdHistoryType, key: string, frequency: number) => void
    addOrUpdateCmdHis: (type: CmdHistoryType, key: string) => void

    // prompt
    publishPrompt: (name: string, version: string, content: string) => void
    searchPrompt: (name: string, version?: string) => ChatPrompt[]
    listPrompt: () => ChatPrompt[]
    deletePrompt: (name: string, version: string) => void

    // cache
    saveOrUpdateCache: (cache: Cache) => void
    queryCache: (key: string) => Cache | null
    deleteCache: (key: string) => void

    // app setting
    appSetting: () => AppSetting | null
    addAppSetting: (setting: AppSettingContent) => void
}
export type Model = {
    llmType: string
    model: string
}
export type Scenario = {
    name: string
    value: number
}

export type ConfigAct = {
    value: ChatConfig
    modifySystemPrompt: (prompt: string) => void
    modifyContextLimit: (limit: number) => void
    moidfyContext: () => void
    moidfyModel: (model: Model) => void
    modifyMcp: (active: boolean) => void
    modifyScenario: (scenario: Scenario) => void
}

export type ConfigExtAct = {
    value: ConfigExt
    update: (ext: ConfigExt) => void
}

export type PresetAct = {
    get: () => ChatPresetMessage[]
    set: (contents: PresetMessageContent[]) => void
    clear: () => void
}

export type TopicMessageAct = {
    list: (
        topicId: string,
        limit: number,
        withReasoning?: boolean
    ) => ChatMessage[]
    save: (messages: MessageContent[]) => void
}

export type TopicAct = {
    get: () => ChatTopic | null
    list: () => ChatTopic[]
    new: (topicName: string) => string
    switch: (targetTopicId: string) => void
    message: TopicMessageAct
}

export type ChatInfo = {
    value: Chat
    config: ConfigAct
    configExt: ConfigExtAct
    preset: PresetAct
    topic: TopicAct
    remove: () => void
    switch: (targetName: string) => void
}

export type ChatAct = {
    get: (name?: string) => ChatInfo
    new: (name: string, model: () => Promise<Model>) => Promise<void>
    list: () => Chat[]
}

export type QucikSwitchAct = {
    list: (key: string) => CmdHistory[]
    add: (key: string) => void
    get: (key: string) => CmdHistory | null
    delete: (key: string) => void
    update: (key: string, frequency: number) => void
    saveOrUpdate: (key: string) => void
}

export type ExportAct = {
    all: () => ExportMessage[]
    chat: (chatId: string) => ExportMessage[]
    topic: (chatId: string, topicId: string) => ExportMessage[]
}

export type CacheAct = {
    get: (keys: string) => Cache
    set: (caches: Cache) => void
    delete: (keys: string) => void
}

export type PromptAct = {
    list: () => ChatPrompt[]
    search: (name: string, version?: string) => ChatPrompt[]
    publish: (name: string, version: string, content: string) => void
    delete: (name: string, version: string) => void
}

export type AppSettingAct = {
    get: () => AppSetting | null
    set: (setting: AppSettingContent) => void
}

export interface IStore {
    chat: ChatAct
    quickSwitch: QucikSwitchAct
    exprot: ExportAct
    cache: CacheAct
    prompt: PromptAct
    appSetting: AppSettingAct
}
