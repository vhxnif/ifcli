export interface IChatAction {
    init: () => void
    newChat: (name: string) => Promise<void>
    removeChat: () => void
    ask: (content: string) => Promise<void>
    changeChat: () => void
    printChats: () => void
    clearChatMessage: () => void
    printChatConfig: () => void
    printChatHistory: (limit: number) => Promise<void>
    modifyContextSize: (size: number) => void
    modifyModel: () => Promise<void>
    modifySystemPrompt: (prompt: string) => void
    modifyWithContext: () => void
    modifyScenario: () => void
    publishPrompt: () => Promise<void>
    selectPrompt: (name: string) => void
    usefulTools: () => Promise<void>
    prompt: () => string
}
