import { promptMessage } from '../config/prompt-message'
import type {
    IChatStore,
    IDBClient,
    ChatBo,
    ConfigBo,
    ConfigExtBo,
    ConfigExt,
    Model,
    PresetBo,
    TopicBo,
    MessageContent,
    Chat,
    QucikSwitch,
    ChatPrompt,
} from '../types/store-types'
import { uuid } from '../util/common-utils'

export class ChatStore implements IChatStore {
    private readonly client: IDBClient
    constructor(client: IDBClient) {
        this.client = client
    }

    chat(name?: string): ChatBo {
        const chat = name
            ? this.client.queryChat(name)
            : this.client.currentChat()
        if (!chat) {
            throw new Error(promptMessage.chatMissing)
        }
        const { id, name: sourceName } = chat
        return {
            chat,
            getConfig: () => this.config(id),
            getConfigExt: () => this.configExt(id),
            getPreset: () => this.preset(id),
            getTopic: () => this.topic(id),
            removeChat: () => this.removeChat(id),
            switch: (targetName) => this.switchChat(sourceName, targetName),
        } as ChatBo
    }

    private config(chatId: string): ConfigBo {
        const config = this.client.queryConfig(chatId)
        if (!config) {
            throw new Error(promptMessage.chatConfigMissing)
        }
        const { id, withContext, sysPrompt } = config
        return {
            config,
            modifySystemPrompt: (prompt) =>
                this.client.modifySystemPrompt(id, prompt),
            modifyContextLimit: (limit) =>
                this.client.modifyContextLimit(id, limit),
            moidfyContext: () => this.client.modifyContext(id, !withContext),
            modifyMcp: (active) => {
                this.client.modifyMcp(id, active)
            },
            modifyScenario: (scenario) =>
                this.client.modifyScenario(id, scenario),
            moidfyModel: (model) => this.client.modifyModel(id, model),
            publishPrompt: (name, version) =>
                this.client.publishPrompt(name, version, sysPrompt),
        } as ConfigBo
    }

    private configExt(chatId: string): ConfigExtBo {
        const extBo = this.client.queryConfigExt(chatId)
        if (!extBo) {
            throw new Error(promptMessage.configExtMissing)
        }
        const { ext } = extBo
        return {
            ext: JSON.parse(ext) as ConfigExt,
            updateExt: (ext) =>
                this.client.updateConfigExt(chatId, JSON.stringify(ext)),
        } as ConfigExtBo
    }

    private preset(chatId: string): PresetBo {
        return {
            presets: () => this.client.queryPreset(chatId),
            create: (contents) => {
                this.client.trans(() => {
                    this.client.delPreset(chatId)
                    this.client.addPreset(chatId, contents)
                })
            },
            clear: () => this.client.delPreset(chatId),
        } as PresetBo
    }

    private topic(chatId: string): TopicBo {
        return {
            topic: () => this.client.currentTopic(chatId),
            topics: () => this.client.queryTopic(chatId),
            newTopic: (topicName: string) => {
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
            messages: (
                topicId: string,
                limit: number,
                withReasoning?: boolean
            ) => this.client.queryMessage(topicId, limit, withReasoning),
            saveMessage: (messages: MessageContent[]) =>
                this.client.saveMessage(messages),
        } as TopicBo
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

    async newChat(name: string, model: () => Promise<Model>): Promise<void> {
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

    chats(): Chat[] {
        return this.client.chats()
    }

    chatQuickSwitch() {
        return {
            history: (k) => this.client.queryCmdHis('chat_switch', k),
            add: (k) => this.client.addCmdHis('chat_switch', k),
            get: (k) => this.client.getCmdHis('chat_switch', k),
            delete: (k) => this.client.delCmdHis('chat_switch', k),
            update: (k, v) => this.client.updateCmdHis('chat_switch', k, v),
            addOrUpdate: (k) => this.client.addOrUpdateCmdHis('chat_switch', k),
        } as QucikSwitch
    }

    searchPrompt(name: string, version?: string): ChatPrompt[] {
        return this.client.searchPrompt(name, version)
    }
}
