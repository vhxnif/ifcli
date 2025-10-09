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
        const { id } = chat
        return {
            chat,
            getConfig: () => this.config(id),
            getConfigExt: () => this.configExt(id),
            getPreset: () => this.preset(id),
            getTopic: () => this.topic(id),
        } as ChatBo
    }

    private config(chatId: string): ConfigBo {
        const config = this.client.queryConfig(chatId)
        if (!config) {
            throw new Error(promptMessage.chatConfigMissing)
        }
        const { id, withContext } = config
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
            newTopic: (topicName: string) => {
                const topicId = uuid()
                this.client.trans(() => {
                    this.client.unselectTopic(chatId)
                    this.client.addTopic(chatId, topicId, topicName)
                })
                return topicId
            },
            messages: (topicId: string, limit: number) =>
                this.client.queryMessage(topicId, limit),
            saveMessage: (messages: MessageContent[]) =>
                this.client.saveMessage(messages),
        } as TopicBo
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
}
