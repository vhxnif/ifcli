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

export class ChatPrompt {
    name!: string
    version!: string
    role!: string
    content!: string
    modifyTime!: bigint  
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

    // ---- prompt ---- //
    publishPrompt: (name: string, version: string, content: string) => void
    searchPrompt: (name: string, version?: string) => ChatPrompt[]

    // ---- other ---- //
    contextRun: (f: (cf:ChatConfig) => void) => void


}