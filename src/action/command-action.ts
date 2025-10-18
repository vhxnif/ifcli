import type { Setting } from '../config/app-setting'
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
    IAct,
    IChatAct,
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

    constructor(store: IStore, setting: Setting) {
        this.chatAct = new ChatAct(store, setting)
        this.settingAct = new SettingAct()
    }

    get chat(): ChatCmdAct {
        return {
            ask: this.askAct(),
            new: async (n) => await this.chatAct.newChat(n),
            msgHistory: async (l, n) =>
                await this.chatAct.printChatHistory(l, n),
            remove: async () => await this.chatAct.removeChat(),
            switch: this.switchAct(),
            prompt: this.promptAct(),
            preset: this.presetAct(),
            config: this.configAct(),
            export: this.exportAct(),
        } as ChatCmdAct
    }

    private askAct(): AskAct {
        return {
            run: async (p) => await this.chatAct.ask(p),
            reRun: async (n) => await this.chatAct.reAsk(n),
        } as AskAct
    }

    private switchAct(): SwitchAct {
        return {
            chat: async (n) => await this.chatAct.changeChat(n),
            topic: async () => await this.chatAct.changeTopic(),
        } as SwitchAct
    }

    private promptAct(): PromptAct {
        return {
            list: async (p, n) => await this.chatAct.selectPrompt(p, n),
            get: (n) => this.chatAct.queryPrompt(n),
            set: (c, n) => this.chatAct.modifySystemPrompt(c, n),
            show: (n) => this.chatAct.printPrompt(n),
            publish: async (n) => await this.chatAct.publishPrompt(n),
        } as PromptAct
    }

    private presetAct(): PresetAct {
        return {
            edit: async (n) => await this.chatAct.editPresetMessage(n),
            clear: (n) => this.chatAct.clearPresetMessage(n),
            show: (n) => this.chatAct.printPresetMessage(n),
        } as PresetAct
    }

    private configAct(): ConfigAct {
        return {
            contextSize: (l, n) => this.chatAct.modifyContextSize(l, n),
            model: async (n) => await this.chatAct.modifyModel(n),
            context: (n) => this.chatAct.modifyWithContext(n),
            mcp: async (n) => await this.chatAct.modifyWithMCP(n),
            scenario: async (n) => await this.chatAct.modifyScenario(n),
            show: (n) => this.chatAct.printChatConfig(n),
        } as ConfigAct
    }

    private exportAct(): ExportAct {
        return {
            all: async (p) => await this.chatAct.exportAllChatMessage(p),
            chat: async (p) => await this.chatAct.exportChatMessage(p),
            chatTopic: async (p) =>
                await this.chatAct.exportChatTopicMessage(p),
            topic: async (p) => await this.chatAct.exportTopicMessage(p),
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
            modify: async () => await this.settingAct.modify(),
            theme: async () => await this.settingAct.theme(),
        } as AppConfigAct
    }

    private appMCPAct(): AppMCPAct {
        return {
            tools: {
                list: async () => await this.chatAct.tools(),
                test: async () => await this.chatAct.testTool(),
            } as AppMCPToolsAct,
        } as AppMCPAct
    }

    private appPromptAct(): AppPromptAct {
        return {
            list: async (n) => await this.chatAct.listPrompt(n),
            export: async () => await this.chatAct.exportPrompt(),
            import: async (f) => await this.chatAct.importPrompt(f),
            delete: async (n) => await this.chatAct.deletePrompt(n),
        } as AppPromptAct
    }
}
