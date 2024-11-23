
export interface IChatAction {

    init: () => void
    newChat: (name: string) => void
    removeChat: () => void
    ask: (content: string) => Promise<void>
    changeChat: () => void
    printChats: () => void
    clearChatMessage: () => void
    printChatConfig: () => void
    printChatHistory: () => void
    modifyContextSize: (size: number) => void
    modifyModel: () => void
    modifySystemPrompt: (prompt: string) => void
    modifyWithContext: () => void
    publishPrompt: () => void
    selectPrompt: (name: string) => void
}


export interface IToolsAction {

    suggest: (content: string, excluded: string[]) => Promise<void>

    improve: (content: string) => Promise<void>

    trans: (content: string, lang: string) => Promise<void>

}