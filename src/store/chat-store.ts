/* eslint-disable @typescript-eslint/no-unused-vars */
import { Database } from 'bun:sqlite'
import { temperature } from '../types/constant'
import {
    AppSetting,
    Chat,
    ChatConfig,
    ChatMessage,
    ChatPresetMessage,
    ChatPrompt,
    ChatTopic,
    SqliteTable,
    type AppSettingContent,
    type IChatStore,
    type MessageContent,
    type PresetMessageContent,
} from '../types/store-types'
import { isEmpty, unixnow, uuid } from '../util/common-utils'
import { table_def } from './table-def'
import { defaultSetting } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'

export class ChatStore implements IChatStore {
    private db: Database
    constructor(db: Database) {
        this.db = db
        this.init()
    }

    init = () => {
        const tables = this.db
            .query("SELECT name FROM sqlite_master WHERE type='table';")
            .as(SqliteTable)
            .all()
            .map((it) => it.name)
        Object.entries(table_def)
            .filter(([k, _]) => !tables.includes(k))
            .forEach(([_, v]) => {
                this.db.run(v)
            })
        if (!this.appSetting()) {
            this.addAppSetting(defaultSetting)
        }
    }

    private appSettingColumn =
        'id, version, general_setting as generalSetting, mcp_server as mcpServer, llm_setting as llmSetting, create_time as createTime'
    private chatColumn =
        'id, name, "select", action_time as actionTime, select_time as selectTime'
    private chatMessageColumn =
        'id, topic_id as topicId, "role", content, pair_key as pairKey, action_time as actionTime'
    private chatConfigColumn =
        'id, chat_id as chatId , sys_prompt as sysPrompt, with_context as withContext, with_mcp as withMCP, context_limit as contextLimit, llm_type as llmType, model, scenario_name as scenarioName, scenario, update_time as updateTime'
    private chatPromptColumn =
        'name, version, role, content, modify_time as modifyTime'
    private chatPresetMessageColumn =
        'id, chat_id, user, assistant, create_time as createTime'
    private chatTopicColumn =
        'id, chat_id as chatId, content, "select", select_time as selectTime, create_time as createTime'

    chats = () =>
        this.db.query(`SELECT ${this.chatColumn} FROM chat`).as(Chat).all()

    queryChat = (name: string) =>
        this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE name = ?`)
            .as(Chat)
            .get(name)

    newChat = (name: string, prompt: string, llmType: string, model: string) =>
        this.chatNotExistsRun(name, () => {
            const now = unixnow()
            const chatId = uuid()
            const statement = this.db.prepare(
                `INSERT INTO chat (id, name, "select", action_time, select_time) VALUES (?, ?, ?, ?, ?)`
            )
            const configStatement = this.db.prepare(
                `INSERT INTO chat_config (id, chat_id, sys_prompt, with_context, context_limit, with_mcp, llm_type, model, scenario_name, scenario, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            const [scenarioName, scenario] = temperature.general
            this.db.transaction(() => {
                const c = this.currentChat()
                if (c) {
                    this.modifySelect(c.name, false)
                }
                statement.run(chatId, name, true, now, now)
                configStatement.run(
                    uuid(),
                    chatId,
                    prompt,
                    true,
                    10,
                    false,
                    llmType,
                    model,
                    scenarioName,
                    scenario,
                    now
                )
            })()
            return chatId
        })

    removeChat = (name: string) =>
        this.chatExistsRun(name, (c) => {
            const chatId = c.id
            this.db.transaction(() => {
                this.db.prepare(`DELETE FROM chat WHERE id = ?`).run(chatId)
                this.db
                    .query(
                        `select ${this.chatTopicColumn} FROM chat_topic WHERE chat_id = ?`
                    )
                    .as(ChatTopic)
                    .all(chatId)
                    .forEach((it) => {
                        this.db
                            .prepare(
                                `DELETE FROM chat_message WHERE topic_id = ?`
                            )
                            .run(it.id)
                    })
                this.db
                    .prepare(`DELETE FROM chat_topic WHERE chat_id = ?`)
                    .run(chatId)
                this.db
                    .prepare(`DELETE FROM chat_config WHERE chat_id = ?`)
                    .run(chatId)
            })()
        })

    changeChat = (name: string) =>
        this.chatExistsRun(name, (c) => {
            if (c.select) {
                return
            }
            this.currentChatRun((s) => {
                this.db.transaction(() => {
                    this.modifySelect(s.name, false)
                    this.modifySelect(c.name, true)
                })()
            })
        })

    currentChat = () => {
        return this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE "select" = ?`)
            .as(Chat)
            .get(true)
    }

    private existCurrentChat = () => {
        const chat = this.currentChat()
        if (chat) {
            return chat
        }
        throw Error(promptMessage.chatMissing)
    }

    selectedTopic = (chatId: string) => {
        return this.db
            .query(
                `SELECT ${this.chatTopicColumn} FROM chat_topic WHERE "select" = ? and chat_id = ? limit 1`
            )
            .as(ChatTopic)
            .get(true, chatId)
    }

    createTopic = (chatId: string, content: string) => {
        const id = uuid()
        const now = unixnow()
        this.db.transaction(() => {
            this.unselectTopic()
            this.db
                .prepare(
                    `INSERT INTO chat_topic (id, chat_id, content, "select", select_time, create_time) VALUES (?, ?, ?, ?, ?, ?)`
                )
                .run(id, chatId, content, true, now, now)
        })()
        return id
    }

    currentChatTopics = () => {
        return this.currentChatRun((it) => {
            return this.db
                .query(
                    `SELECT ${this.chatTopicColumn} FROM chat_topic WHERE chat_id = ?`
                )
                .as(ChatTopic)
                .all(it.id)
        })
    }

    changeTopic = (topicId: string) => {
        this.db.transaction(() => {
            this.unselectTopic()
            this.db
                .prepare(`UPDATE chat_topic SET "select" = ? where id = ?`)
                .run(true, topicId)
        })()
    }

    private unselectTopic = () => {
        this.db
            .prepare(`UPDATE chat_topic SET "select" = ? where "select" = ?`)
            .run(false, true)
    }

    saveMessage = (messages: MessageContent[]) => {
        const statement = this.db.prepare(
            `INSERT INTO chat_message (id, topic_id, "role", content, pair_key, action_time) VALUES (?, ?, ?, ?, ?, ?)`
        )
        this.db.transaction(() => {
            messages
                .filter((it) => !isEmpty(it.role) && !isEmpty(it.content))
                .map((it) => [
                    uuid(),
                    it.topicId,
                    it.role,
                    it.content,
                    it.pairKey,
                    unixnow(),
                ])
                .forEach((it) => statement.run(...it))
        })()
    }

    contextMessage = (topicId: string, limit: number) =>
        this.queryMessage(topicId, limit)

    historyMessage = (count: number) => {
        return this.currentChatRun((c) => {
            const stp = this.selectedTopic(c.id)
            if (stp) {
                return this.queryMessage(stp.id, count, true)
            }
            return []
        })
    }

    selectMessage = (messageId: string) =>
        this.db
            .query(
                `SELECT ${this.chatMessageColumn} FROM chat_message WHERE id= ?`
            )
            .as(ChatMessage)
            .get(messageId)!

    currentChatConfig = () => {
        return this.queryChatConfig(this.existCurrentChat().id)
    }

    modifySystemPrompt = (prompt: string) =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET sys_prompt = ?, update_time = ? where id = ?`
                )
                .run(prompt, unixnow(), cf.id)
        )

    modifyContextLimit = (contextLimit: number) =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET context_limit = ?, update_time = ? where id = ?`
                )
                .run(contextLimit, unixnow(), cf.id)
        )

    modifyModel = (llm: string, model: string) =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET llm_type = ?, model = ?, update_time = ? where id = ?`
                )
                .run(llm, model, unixnow(), cf.id)
        )

    modifyWithContext = () =>
        this.changeConfigBooleanType('with_context', (c) => c.withContext)
    modifyWithMCP = () =>
        this.changeConfigBooleanType('with_mcp', (c) => c.withMCP)

    private changeConfigBooleanType = (
        columnName: string,
        f: (f: ChatConfig) => boolean
    ) => {
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET ${columnName} = ?, update_time = ? where id = ?`
                )
                .run(!f(cf), unixnow(), cf.id)
        )
    }

    modifyScenario = (sc: [string, number]) =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET scenario_name = ?, scenario = ?, update_time = ? where id = ?`
                )
                .run(sc[0], sc[1], unixnow(), cf.id)
        )

    publishPrompt = (name: string, version: string, content: string) => {
        const prompt = this.db
            .query(
                `SELECT ${this.chatPromptColumn} FROM chat_prompt WHERE name = ? AND version = ?`
            )
            .as(ChatPrompt)
            .get(name, version)
        if (prompt) {
            this.db
                .prepare(
                    `UPDATE chat_prompt SET content = ?, modify_time = ${unixnow()} WHERE name = ? AND version = ?`
                )
                .run(content, name, version)
            return
        }
        this.db
            .prepare(
                `INSERT INTO chat_prompt (name, version, role, content, modify_time) VALUES (?, ?, ?, ?, ?)`
            )
            .run(name, version, 'system', content, unixnow())
    }

    searchPrompt = (name: string, version?: string) => {
        const sql = `SELECT ${this.chatPromptColumn} FROM chat_prompt`
        if (version) {
            return this.db
                .query(`${sql} WHERE name = ? and version = ?`)
                .as(ChatPrompt)
                .all(name, version)
        }
        return this.db
            .query(`${sql} WHERE name LIKE ?`)
            .as(ChatPrompt)
            .all(`%${name}%`)
    }

    createPresetMessage = (params: PresetMessageContent[]) => {
        const { id } = this.existCurrentChat()
        this.db.transaction(() => {
            this.deletePresetMessage(id)
            this.addPresetMessage(id, params)
        })()
    }

    selectPresetMessage = () => {
        return this.currentChatRun((c) => this.queryPresetMessage(c.id))
    }

    clearPresetMessage = () => {
        this.currentChatRun((c) => this.deletePresetMessage(c.id))
    }

    appSetting = () => {
        return this.db
            .query(
                `SELECT ${this.appSettingColumn} FROM app_setting order by create_time desc limit 1`
            )
            .as(AppSetting)
            .get()
    }

    addAppSetting = (setting: AppSettingContent) => {
        const { version, generalSetting, mcpServer, llmSetting } = setting
        this.db
            .prepare(
                `INSERT INTO app_setting (id, version, general_setting, mcp_server, llm_setting, create_time) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
                uuid(),
                version,
                generalSetting,
                mcpServer,
                llmSetting,
                unixnow()
            )
    }

    private addPresetMessage = (
        chatId: string,
        params: PresetMessageContent[]
    ) => {
        const statement = this.db.prepare(
            `INSERT INTO chat_preset_message (id, chat_id, user, assistant, create_time) VALUES (?, ?, ?, ?, ?)`
        )
        params.forEach((it) => {
            statement.run(uuid(), chatId, it.user, it.assistant, unixnow())
        })
    }

    private queryPresetMessage = (chatId: string) => {
        return this.db
            .query(
                `SELECT ${this.chatPresetMessageColumn} FROM chat_preset_message WHERE chat_id = ?`
            )
            .as(ChatPresetMessage)
            .all(chatId)
    }

    private deletePresetMessage = (chatId: string) => {
        this.db
            .prepare(`DELETE FROM chat_preset_message WHERE chat_id = ?`)
            .run(chatId)
    }

    private chatNotExistsRun = <T>(name: string, f: () => T): T => {
        const c = this.queryChat(name)
        if (c) {
            throw Error(`chat: ${name} exists.`)
        }
        return f()
    }

    private modifySelect = (name: string, select: boolean): void => {
        this.chatExistsRun(name, (c) => {
            this.db
                .prepare('UPDATE chat SET "select" = ? WHERE id = ?')
                .run(select, c.id)
        })
    }

    private chatExistsRun = <T>(name: string, f: (chat: Chat) => T): T => {
        const c = this.queryChat(name)
        if (c) {
            return f(c)
        }
        throw Error(`chat: ${name} not exists.`)
    }

    private currentChatRun = <T>(f: (chat: Chat) => T): T => {
        return f(this.existCurrentChat())
    }

    private currentChatConfigRun = <T>(f: (ct: Chat, cf: ChatConfig) => T): T =>
        this.currentChatRun((c) => f(c, this.queryChatConfig(c.id)))

    private queryMessage = (
        topicId: string,
        count: number,
        withReasoning: boolean = false
    ) =>
        this.db
            .query(
                `
                select ${
                    this.chatMessageColumn
                } from chat_message where topic_id = ? ${
                    withReasoning ? '' : "and role != 'reasoning'"
                } and pair_key in (
                    select pair_key from chat_message group by pair_key order by max(action_time) desc limit ?
                ) order by action_time desc
                `
            )
            .as(ChatMessage)
            .all(topicId, count)

    queryChatConfig = (id: string): ChatConfig =>
        this.db
            .query(
                `SELECT ${this.chatConfigColumn} FROM chat_config WHERE chat_id = ?`
            )
            .as(ChatConfig)
            .get(id)!

    private deleteChatMessage = (chatId: string): void => {
        this.db
            .prepare(`DELETE FROM chat_message WHERE chat_id = ?`)
            .run(chatId)
    }
}
