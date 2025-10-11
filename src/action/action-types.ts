import type { GeneralSetting } from '../config/app-setting'

export type AskContent = {
    content: string
    chatName?: string
    noStream?: boolean
    newTopic?: boolean
}
export interface IChatAction {
    newChat: (name: string) => Promise<void>
    removeChat: () => Promise<void>
    reAsk: () => Promise<void>
    ask: (param: AskContent) => Promise<void>
    changeChat: (name?: string) => Promise<void>
    changeTopic: () => Promise<void>
    printChatConfig: (chatName?: string) => void
    printChatHistory: (limit: number, chatName?: string) => Promise<void>
    modifyContextSize: (size: number, chatName?: string) => void
    modifyModel: (chatName?: string) => Promise<void>
    modifySystemPrompt: (prompt: string, chatName?: string) => void
    modifyWithContext: (chatName?: string) => void
    modifyWithMCP: (chatName?: string) => Promise<void>
    modifyScenario: (chatName?: string) => Promise<void>
    publishPrompt: (chatName?: string) => Promise<void>
    selectPrompt: (name: string, chatName?: string) => Promise<void>
    listPrompt: (name?: string) => Promise<void>
    deletePrompt: (name?: string) => Promise<void>
    tools: () => Promise<void>
    testTool: () => Promise<void>

    prompt: (chatName?: string) => string
    printPrompt: (chatName?: string) => void
    exportPrompt: () => Promise<void>
    importPrompt: (file: string) => Promise<void>
    editPresetMessage: (chatName?: string) => Promise<void>
    clearPresetMessage: (chatName?: string) => void
    printPresetMessage: (chatName?: string) => void

    exportAllChatMessage: (path?: string) => Promise<void>
    exportChatMessage: (path?: string) => Promise<void>
    exportChatTopicMessage: (path?: string) => Promise<void>
    exportTopicMessage: (path?: string) => Promise<void>
}

export interface ISettingAction {
    setting: () => Promise<void>
    theme: () => Promise<void>
    importSetting: (file: string) => Promise<void>
    exportSetting: () => Promise<void>
    generalSetting: GeneralSetting
}
