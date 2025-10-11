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

    queryPrompt: (chatName?: string) => string
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

export type AskAct = {
    run: (param: AskContent) => Promise<void>
    reRun: () => Promise<void>
}

export type SwitchAct = {
    chat: (name?: string) => Promise<void>
    topic: () => Promise<void>
}

export type PromptAct = {
    list: (name: string, chatName?: string) => Promise<void>
    get: (chatName?: string) => string
    set: (prompt: string, chatName?: string) => void
    show: (chatName?: string) => void
    publish: (chatName?: string) => Promise<void>
}

export type PresetAct = {
    edit: (chatName?: string) => Promise<void>
    clear: (chatName?: string) => void
    show: (chatName?: string) => void
}

export type ConfigAct = {
    contextSize: (size: number, chatName?: string) => void
    model: (chatName?: string) => Promise<void>
    context: (chatName?: string) => void
    mcp: (chatName?: string) => Promise<void>
    scenario: (chatName?: string) => Promise<void>
    show: (chatName?: string) => void
}

export type ExportAct = {
    all: (path?: string) => Promise<void>
    chat: (path?: string) => Promise<void>
    chatTopic: (path?: string) => Promise<void>
    topic: (path?: string) => Promise<void>
}

export type ChatCommandAct = {
    ask: AskAct
    new: (name: string) => Promise<void>
    msgHistory: (limit: number, chatName?: string) => Promise<void>
    remove: () => Promise<void>
    switch: SwitchAct
    prompt: PromptAct
    preset: PresetAct
    config: ConfigAct
    export: ExportAct
}

export interface ICommanndAct {
    chat: ChatCommandAct
}
