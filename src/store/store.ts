import { promptMessage } from '../config/prompt-message'
import type {
    AppSettingAct,
    CacheAct,
    ChatAct,
    ChatInfo,
    ConfigAct,
    ConfigExt,
    ConfigExtAct,
    ExportAct,
    IStore,
    IDBClient,
    MessageContent,
    Model,
    PresetAct,
    PromptAct,
    QucikSwitchAct,
    TopicAct,
    TopicMessageAct,
} from './store-types'
import { uuid } from '../util/common-utils'

export class Store implements IStore {
    private readonly client: IDBClient
    constructor(client: IDBClient) {
        this.client = client
    }

    get chat(): ChatAct {
        return {
            get: (n) => this.getChat(n),
            list: () => this.client.chats(),
            new: async (n, m) => this.newChat(n, m),
        } as ChatAct
    }

    private getChat(name?: string): ChatInfo {
        const chat = name
            ? this.client.queryChat(name)
            : this.client.currentChat()
        if (!chat) {
            throw new Error(promptMessage.chatMissing)
        }
        const { id, name: sourceName } = chat
        return {
            value: chat,
            config: this.config(id),
            configExt: this.configExt(id),
            preset: this.preset(id),
            topic: this.topic(id),
            remove: () => this.removeChat(id),
            switch: (targetName) => this.switchChat(sourceName, targetName),
        } as ChatInfo
    }

    private config(chatId: string): ConfigAct {
        const config = this.client.queryConfig(chatId)
        if (!config) {
            throw new Error(promptMessage.chatConfigMissing)
        }
        const { id, withContext } = config
        return {
            value: config,
            modifySystemPrompt: (prompt) =>
                this.client.modifySystemPrompt(id, prompt),
            modifyContextLimit: (limit) =>
                this.client.modifyContextLimit(id, limit),
            moidfyContext: () => this.client.modifyContext(id, withContext === 0),
            modifyMcp: (active) => {
                this.client.modifyMcp(id, active)
            },
            modifyScenario: (scenario) =>
                this.client.modifyScenario(id, scenario),
            moidfyModel: (model) => this.client.modifyModel(id, model),
        } as ConfigAct
    }

    private configExt(chatId: string): ConfigExtAct {
        const extBo = this.client.queryConfigExt(chatId)
        if (!extBo) {
            throw new Error(promptMessage.configExtMissing)
        }
        const { ext } = extBo
        return {
            value: JSON.parse(ext) as ConfigExt,
            update: (ext) =>
                this.client.updateConfigExt(chatId, JSON.stringify(ext)),
        } as ConfigExtAct
    }

    private preset(chatId: string): PresetAct {
        return {
            get: () => this.client.queryPreset(chatId),
            set: (contents) => {
                this.client.trans(() => {
                    this.client.delPreset(chatId)
                    this.client.addPreset(chatId, contents)
                })
            },
            clear: () => this.client.delPreset(chatId),
        } as PresetAct
    }

    private topic(chatId: string): TopicAct {
        return {
            get: () => this.client.currentTopic(chatId),
            list: () => this.client.queryTopic(chatId),
            new: (topicName: string) => {
                const topicId = uuid()
                this.client.trans(() => {
                    this.client.unselectTopic(chatId)
                    this.client.addTopic(chatId, topicId, topicName)
                })
                return topicId
            },
            switch: (targetTopicId: string) => {
                this.client.trans(() => {
                    this.client.unselectTopic(chatId)
                    this.client.selectTopic(targetTopicId, true)
                })
            },
            message: this.topicMessage(),
        } as TopicAct
    }

    private topicMessage(): TopicMessageAct {
        return {
            list: (topicId: string, limit: number, withReasoning?: boolean) =>
                this.client.queryMessage(topicId, limit, withReasoning),
            save: (messages: MessageContent[]) =>
                this.client.saveMessage(messages),
        } as TopicMessageAct
    }

    private removeChat(chatId: string) {
        this.client.trans(() => {
            this.client.delChat(chatId)
            this.client.delConfig(chatId)
            this.client.delConfigExt(chatId)
            this.client.delPreset(chatId)
            this.client
                .queryTopic(chatId)
                .forEach((it) => this.client.delMessage(it.id))
            this.client.delChatTopic(chatId)
        })
    }

    private switchChat(sourceName: string, targetName: string) {
        this.client.trans(() => {
            this.client.selectChat(sourceName, false)
            this.client.selectChat(targetName, true)
        })
    }

    private async newChat(
        name: string,
        model: () => Promise<Model>
    ): Promise<void> {
        const chat = this.client.queryChat(name)
        const f = () => {
            const { name: source } = this.client.currentChat()!
            this.client.selectChat(source, false)
            this.client.selectChat(name, true)
        }
        if (chat) {
            this.client.trans(f)
            return
        }
        const md = await model()
        this.client.trans(() => {
            const chatId = this.client.addChat(name)
            this.client.addConfig(chatId, md)
            this.client.addConfigExt(
                chatId,
                JSON.stringify({ mcpServers: [] } as ConfigExt)
            )
            f()
        })
    }

    get quickSwitch() {
        return {
            list: (k) => this.client.queryCmdHis('chat_switch', k),
            add: (k) => this.client.addCmdHis('chat_switch', k),
            get: (k) => this.client.getCmdHis('chat_switch', k),
            delete: (k) => this.client.delCmdHis('chat_switch', k),
            update: (k, v) => this.client.updateCmdHis('chat_switch', k, v),
            saveOrUpdate: (k) =>
                this.client.addOrUpdateCmdHis('chat_switch', k),
        } as QucikSwitchAct
    }

    get exprot(): ExportAct {
        return {
            all: () => this.client.queryAllExportMessage(),
            chat: (chatId) => this.client.queryChatExportMessage(chatId),
            topic: (chatId, topicId) =>
                this.client.queryChatTopicExportMessage(chatId, topicId),
        } as ExportAct
    }

    get cache(): CacheAct {
        return {
            get: (k) => this.client.queryCache(k),
            delete: (k) => this.client.deleteCache(k),
            set: (c) => this.client.saveOrUpdateCache(c),
        } as CacheAct
    }

    get prompt(): PromptAct {
        return {
            list: () => this.client.listPrompt(),
            search: (n, v) => this.client.searchPrompt(n, v),
            publish: (n, v, c) => this.client.publishPrompt(n, v, c),
        } as PromptAct
    }

    get appSetting(): AppSettingAct {
        return {
            get: () => this.client.appSetting(),
            set: (c) => this.client.addAppSetting(c),
        } as AppSettingAct
    }
}
