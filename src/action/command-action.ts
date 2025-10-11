import type { IStore } from '../store/store-types'
import type {
    AppConfigAct,
    AppMCPAct,
    AppMCPToolsAct,
    AppPromptAct,
    AskAct,
    ChatCmdAct,
    ConfigAct,
    ExportAct,
    IChatAct,
    IAct,
    ISettingAct,
    PresetAct,
    PromptAct,
    SettingCmdAct,
    SwitchAct,
} from './action-types'
import { ChatAct } from './chat-action'
import { SettingAct } from './setting-action'

export class Act implements IAct {
    private readonly chatAct: IChatAct
    private readonly settingAct: ISettingAct

    constructor(store: IStore) {
        this.chatAct = new ChatAct(store)
        this.settingAct = new SettingAct(store)
    }

    get chat(): ChatCmdAct {
        return {
            ask: this.askAct(),
            new: (n) => this.chatAct.newChat(n),
            msgHistory: (l, n) => this.chatAct.printChatHistory(l, n),
            remove: () => this.chatAct.removeChat(),
            switch: this.switchAct(),
            prompt: this.promptAct(),
            preset: this.presetAct(),
            config: this.configAct(),
            export: this.exportAct(),
        } as ChatCmdAct
    }

    private askAct(): AskAct {
        return {
            run: (p) => this.chatAct.ask(p),
            reRun: () => this.chatAct.reAsk(),
        } as AskAct
    }

    private switchAct(): SwitchAct {
        return {
            chat: (n) => this.chatAct.changeChat(n),
            topic: () => this.chatAct.changeTopic(),
        } as SwitchAct
    }

    private promptAct(): PromptAct {
        return {
            list: (p, n) => this.chatAct.selectPrompt(p, n),
            get: (n) => this.chatAct.queryPrompt(n),
            set: (c, n) => this.chatAct.modifySystemPrompt(c, n),
            show: (n) => this.chatAct.printPrompt(n),
            publish: (n) => this.chatAct.publishPrompt(n),
        } as PromptAct
    }

    private presetAct(): PresetAct {
        return {
            edit: (n) => this.chatAct.editPresetMessage(n),
            clear: (n) => this.chatAct.clearPresetMessage(n),
            show: (n) => this.chatAct.printPresetMessage(n),
        } as PresetAct
    }

    private configAct(): ConfigAct {
        return {
            contextSize: (l, n) => this.chatAct.modifyContextSize(l, n),
            model: (n) => this.chatAct.modifyModel(n),
            context: (n) => this.chatAct.modifyWithContext(n),
            mcp: (n) => this.chatAct.modifyWithMCP(n),
            scenario: (n) => this.chatAct.modifyScenario(n),
            show: (n) => this.chatAct.printChatConfig(n),
        } as ConfigAct
    }

    private exportAct(): ExportAct {
        return {
            all: (p) => this.chatAct.exportAllChatMessage(p),
            chat: (p) => this.chatAct.exportChatMessage(p),
            chatTopic: (p) => this.chatAct.exportChatTopicMessage(p),
            topic: (p) => this.chatAct.exportTopicMessage(p),
        } as ExportAct
    }

    get setting(): SettingCmdAct {
        return {
            config: this.appConfigAct(),
            mcp: this.appMCPAct(),
            prompt: this.appPromptAct(),
        } as SettingCmdAct
    }

    private appConfigAct(): AppConfigAct {
        return {
            general: () => this.settingAct.generalSetting,
            modify: () => this.settingAct.setting(),
            theme: () => this.settingAct.theme(),
            import: (f) => this.settingAct.importSetting(f),
            export: () => this.settingAct.exportSetting(),
        } as AppConfigAct
    }

    private appMCPAct(): AppMCPAct {
        return {
            tools: {
                list: () => this.chatAct.tools(),
                test: () => this.chatAct.testTool(),
            } as AppMCPToolsAct,
        } as AppMCPAct
    }

    private appPromptAct(): AppPromptAct {
        return {
            list: (n) => this.chatAct.listPrompt(n),
            export: () => this.chatAct.exportPrompt(),
            import: (f) => this.chatAct.importPrompt(f),
            delete: (n) => this.chatAct.deletePrompt(n),
        } as AppPromptAct
    }
}
