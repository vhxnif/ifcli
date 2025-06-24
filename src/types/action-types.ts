export type AskContent = {
    content: string
    chatName?: string
    noStream?: boolean
    newTopic?: boolean
}
export interface IChatAction {
    newChat: (name: string) => Promise<void>
    removeChat: () => Promise<void>
    ask: (param: AskContent) => Promise<void>
    changeChat: () => Promise<void>
    changeTopic: () => Promise<void>
    printTopics: () => Promise<void>
    printChats: () => Promise<void>
    printChatConfig: () => void
    printChatHistory: (limit: number, exp?: boolean) => Promise<void>
    modifyContextSize: (size: number) => void
    modifyModel: () => Promise<void>
    modifySystemPrompt: (prompt: string) => void
    modifyWithContext: () => void
    modifyWithMCP: () => void
    modifyScenario: () => Promise<void>
    publishPrompt: () => Promise<void>
    selectPrompt: (name: string) => Promise<void>
    listPrompt: (name?: string) => Promise<void>
    tools: () => Promise<void>
    testTool: () => Promise<void>

    prompt: () => string
    printPrompt: () => void 
    editPresetMessage: () => Promise<void>
    clearPresetMessage: () => void
    printPresetMessage: () => void
}

export interface ISettingAction {
    setting: () => Promise<void>
    theme: () => Promise<void>
}
