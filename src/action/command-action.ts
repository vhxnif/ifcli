import type {
    AskAct,
    ChatCommandAct,
    ConfigAct,
    ExportAct,
    IChatAction,
    ICommanndAct,
    PresetAct,
    PromptAct,
    SwitchAct,
} from './action-types'

export class CommandAction implements ICommanndAct {
    private readonly chatAction: IChatAction

    constructor({ chatAction }: { chatAction: IChatAction }) {
        this.chatAction = chatAction
    }

    get chat(): ChatCommandAct {
        return {
            ask: this.askAct(),
            new: (n) => this.chatAction.newChat(n),
            msgHistory: (l, n) => this.chatAction.printChatHistory(l, n),
            remove: () => this.chatAction.removeChat(),
            switch: this.switchAct(),
            prompt: this.promptAct(),
            preset: this.presetAct(),
            config: this.configAct(),
            export: this.exportAct(),
        } as ChatCommandAct
    }

    private askAct(): AskAct {
        return {
            run: (p) => this.chatAction.ask(p),
            reRun: () => this.chatAction.reAsk(),
        } as AskAct
    }

    private switchAct(): SwitchAct {
        return {
            chat: (n) => this.chatAction.changeChat(n),
            topic: () => this.chatAction.changeTopic(),
        } as SwitchAct
    }

    private promptAct(): PromptAct {
        return {
            list: (p, n) => this.chatAction.selectPrompt(p, n),
            get: (n) => this.chatAction.queryPrompt(n),
            set: (c, n) => this.chatAction.modifySystemPrompt(c, n),
            show: (n) => this.chatAction.printPrompt(n),
            publish: (n) => this.chatAction.publishPrompt(n),
        } as PromptAct
    }

    private presetAct(): PresetAct {
        return {
            edit: (n) => this.chatAction.editPresetMessage(n),
            clear: (n) => this.chatAction.clearPresetMessage(n),
            show: (n) => this.chatAction.printPresetMessage(n),
        } as PresetAct
    }

    private configAct(): ConfigAct {
        return {
            contextSize: (l, n) => this.chatAction.modifyContextSize(l, n),
            model: (n) => this.chatAction.modifyModel(n),
            context: (n) => this.chatAction.modifyWithContext(n),
            mcp: (n) => this.chatAction.modifyWithMCP(n),
            scenario: (n) => this.chatAction.modifyScenario(n),
            show: (n) => this.chatAction.printChatConfig(n),
        } as ConfigAct
    }

    private exportAct(): ExportAct {
        return {
            all: (p) => this.chatAction.exportAllChatMessage(p),
            chat: (p) => this.chatAction.exportChatMessage(p),
            chatTopic: (p) => this.chatAction.exportChatTopicMessage(p),
            topic: (p) => this.chatAction.exportTopicMessage(p),
        } as ExportAct
    }
}
