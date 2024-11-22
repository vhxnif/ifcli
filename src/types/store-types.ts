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
    contextLimit!: number
    model!: string
    updateTime!: bigint
}

export type MessageContent = {
    role: 'user' | 'assistant'
    content: string,
    pairKey: string,
}

export interface IChatStore {
    init: () => void
    // ---- chat ---- //
    chats: () => Chat[]
    queryChat: (name: string) => Chat | null
    newChat: (name: string, prompt: string, model: string) => void
    removeChat: (name: string) => void
    changeChat: (name: string) => void
    currentChat: () => Chat

    // ---- message ---- //
    saveMessage: (messages: MessageContent[]) => void
    clearMessage: () => void
    contextMessage: () => ChatMessage[]
    historyMessage: (count: number) => ChatMessage[]

    // ---- config ---- //
    modifySystemPrompt: (prompt: string) => void
    modifyContextLimit: (contextLimit: number) => void
    modifyModel: (model: string) => void
    modifyWithContext: () => void

    // ---- other ---- //
    contextRun: (f: (cf:ChatConfig) => void) => void


}