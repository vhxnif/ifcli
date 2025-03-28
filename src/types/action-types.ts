export interface IChatAction {
    init: () => void
    newChat: (name: string) => void
    removeChat: () => void
    ask: (content: string) => Promise<void>
    changeChat: () => void
    printChats: () => void
    clearChatMessage: () => void
    printChatConfig: () => void
    printChatHistory: (limit: number) => Promise<void>
    modifyContextSize: (size: number) => void
    modifyModel: () => void
    modifySystemPrompt: (prompt: string) => void
    modifyWithContext: () => void
    modifyScenario: () => void
    publishPrompt: () => void
    selectPrompt: (name: string) => void
    usefulTools: () => void
    prompt: () => string
}
