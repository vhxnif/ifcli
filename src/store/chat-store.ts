/* eslint-disable @typescript-eslint/no-unused-vars */
import { Database } from 'bun:sqlite'
import { isEmpty } from 'lodash'
import { nanoid } from 'nanoid'
import { unixnow } from '../util/common-utils'
import type { IConfig } from '../types/config-types'
import {
    Chat,
    ChatConfig,
    ChatMessage,
    ChatPrompt,
    type IChatStore,
    type MessageContent,
} from '../types/store-types'
import { table_def } from './table-def'
import { temperature } from '../types/constant'

class SqliteTable {
    name!: string
}

export class ChatStore implements IChatStore {
    private db: Database
    constructor(config: IConfig) {
        this.db = new Database(config.dataPath(), { strict: true })
    }

    clearMessage = () =>
        this.currentChatRun((c) => this.deleteChatMessage(c.id))

    contextRun = (f: (cf: ChatConfig) => void) => {
        f(this.currentChatRun((c) => this.queryChatConfig(c.id)))
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
    }

    private chatColumn =
        'id, name, "select", action_time as actionTime, select_time as selectTime'
    private chatMessageColumn =
        'id, chat_id as chatId, "role", content, pair_key as pairKey, action_time as actionTime'
    private chatConfigColumn =
        'id, chat_id as chatId , sys_prompt as sysPrompt, with_context as withContext, context_limit as contextLimit, model, scenario_name as scenarioName, scenario, update_time as updateTime'
    private chatPromptColumn =
        'name, version, role, content, modify_time as modifyTime'

    chats = () =>
        this.db.query(`SELECT ${this.chatColumn} FROM chat`).as(Chat).all()

    queryChat = (name: string) =>
        this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE name = ?`)
            .as(Chat)
            .get(name)

    newChat = (name: string, prompt: string, model: string) =>
        this.chatNotExistsRun(name, () => {
            const now = unixnow()
            const chatId = nanoid()
            const statement = this.db.prepare(
                `INSERT INTO chat (id, name, "select", action_time, select_time) VALUES (?, ?, ?, ?, ?)`
            )
            const configStatement = this.db.prepare(
                `INSERT INTO chat_config (id, chat_id, sys_prompt, with_context, context_limit, model, scenario_name, scenario, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            const [scenarioName, scenario] = temperature.general
            this.db.transaction(() => {
                const c = this.currentChat()
                if (c) {
                    this.modifySelect(c.name, false)
                }
                statement.run(chatId, name, true, now, now)
                configStatement.run(
                    nanoid(),
                    chatId,
                    prompt,
                    true,
                    10,
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
                    .prepare(`DELETE FROM chat_message WHERE chat_id = ?`)
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

    currentChat = () =>
        this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE "select" = ?`)
            .as(Chat)
            .get(true)!

    saveMessage = (messages: MessageContent[]) =>
        this.currentChatRun((c) => {
            const statement = this.db.prepare(
                `INSERT INTO chat_message (id, chat_id, "role", content, pair_key, action_time) VALUES (?, ?, ?, ?, ?, ?)`
            )
            this.db.transaction(() => {
                messages
                    .filter((it) => !isEmpty(it.role) && !isEmpty(it.content))
                    .map((it) => [
                        nanoid(),
                        c.id,
                        it.role,
                        it.content,
                        it.pairKey,
                        unixnow(),
                    ])
                    .forEach((it) => statement.run(...it))
            })()
        })

    contextMessage = () =>
        this.currentChatConfigRun((c, cf) =>
            this.queryMessage(c.id, cf.contextLimit)
        )

    historyMessage = (count: number) =>
        this.currentChatRun((c) => this.queryMessage(c.id, count))

    selectMessage = (messageId: string) => 
        this.db
            .query(
                `SELECT ${this.chatMessageColumn} FROM chat_message WHERE id= ?`
            )
            .as(ChatMessage)
            .get(messageId)!

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

    modifyModel = (model: string) =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET model = ?, update_time = ? where id = ?`
                )
                .run(model, unixnow(), cf.id)
        )

    modifyWithContext = () =>
        this.currentChatConfigRun((_, cf) =>
            this.db
                .prepare(
                    `UPDATE chat_config SET with_context = ?, update_time = ? where id = ?`
                )
                .run(!cf.withContext, unixnow(), cf.id)
        )

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

    private chatNotExistsRun = <T,>(name: string, f: () => T): T => {
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

    private chatExistsRun = <T,>(name: string, f: (chat: Chat) => T): T => {
        const c = this.queryChat(name)
        if (c) {
            return f(c)
        }
        throw Error(`chat: ${name} not exists.`)
    }

    private currentChatRun = <T,>(f: (chat: Chat) => T): T => {
        const c = this.currentChat()
        if (c) {
            return f(c)
        }
        throw Error('selected chat not exists.')
    }

    private currentChatConfigRun = <T,>(
        f: (ct: Chat, cf: ChatConfig) => T
    ): T => this.currentChatRun((c) => f(c, this.queryChatConfig(c.id)))

    private queryMessage = (chatId: string, count: number) =>
        this.db
            .query(
                `
                select ${this.chatMessageColumn } from chat_message where chat_id = ? and pair_key in (
                    select pair_key from chat_message group by pair_key order by max(action_time) desc limit ?
                ) order by action_time desc
                `
            )
            .as(ChatMessage)
            .all(chatId, count)

    private queryChatConfig = (id: string): ChatConfig =>
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
