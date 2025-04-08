export class Chat {
    id!: string
    name!: string
    select!: boolean
    actionTime!: bigint
    selectTime!: bigint
}

export class ChatMessage {
    id!: string
    chatId!: string
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
    interactiveOutput!: boolean
    withMCP!: boolean
    contextLimit!: number
    llmType!: string
    model!: string
    scenarioName!: string
    scenario!: number
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
    chat_id!: string
    user!: string
    assistant!: string
    create_time!: bigint
}

export class AppSetting {
    id!: string
    version!: string
    mcpServer!: string
    llmSetting!: string
    create_time!: bigint
}

export type MessageContent = {
    chatId: string,
    role: 'user' | 'assistant' | 'reasoning'
    content: string
    pairKey: string
}

export type PresetMessageContent = {
    user: string
    assistant: string
}

export type AppSettingContent = {
    version: string
    mcpServer: string
    llmSetting: string
}

export interface IChatStore {
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
    currentChat: () => Chat
    getChat: (name: string) => Chat | null

    // ---- message ---- //
    saveMessage: (messages: MessageContent[]) => void
    clearMessage: () => void
    contextMessage: () => ChatMessage[]
    historyMessage: (count: number) => ChatMessage[]
    selectMessage: (messageId: string) => ChatMessage

    // ---- config ---- //
    chatConfig: () => ChatConfig
    modifySystemPrompt: (prompt: string) => void
    modifyContextLimit: (contextLimit: number) => void
    modifyModel: (llm: string, model: string) => void
    modifyWithContext: () => void
    modifyInteractiveOutput: () => void
    modifyWithMCP: () => void
    modifyScenario: (sc: [string, number]) => void
    queryChatConfig: (chatId: string) => ChatConfig

    // ---- prompt ---- //
    publishPrompt: (name: string, version: string, content: string) => void
    searchPrompt: (name: string, version?: string) => ChatPrompt[]

    // ---- preset message ---- //
    createPresetMessage: (params: PresetMessageContent[]) => void
    selectPresetMessage: () => ChatPresetMessage[]
    clearPresetMessage: () => void
    // ---- app setting ----
    appSetting: () => AppSetting | null
    addAppSetting: (setting: AppSettingContent) => void

    // ---- other ---- //
    contextRun: (f: (cf: ChatConfig) => void) => void
}
