/* eslint-disable @typescript-eslint/no-unused-vars */
import Database from 'bun:sqlite'
import {
    AppSetting,
    Cache,
    Chat,
    ChatConfig,
    ChatConfigExt,
    ChatMessage,
    ChatPresetMessage,
    ChatPrompt,
    ChatTopic,
    CmdHistory,
    ExportMessage,
    SqliteTable,
    type AppSettingContent,
    type CmdHistoryType,
    type IDBClient,
    type MessageContent,
    type Model,
    type PresetMessageContent,
    type RunSql,
    type Scenario,
} from './store-types'
import { table_def } from './table-def'
import { isEmpty, unixnow, uuid } from '../util/common-utils'
import { defaultSetting } from '../config/app-setting'
import { temperature } from '../llm/llm-constant'

export class DBClient implements IDBClient {
    private readonly db: Database

    private readonly appSettingColumn =
        'id, version, general_setting as generalSetting, mcp_server as mcpServer, llm_setting as llmSetting, create_time as createTime'
    private readonly chatColumn =
        'id, name, "select", action_time as actionTime, select_time as selectTime'
    private readonly chatMessageColumn =
        'id, topic_id as topicId, "role", content, pair_key as pairKey, action_time as actionTime'
    private readonly chatConfigColumn =
        'id, chat_id as chatId , sys_prompt as sysPrompt, with_context as withContext, with_mcp as withMCP, context_limit as contextLimit, llm_type as llmType, model, scenario_name as scenarioName, scenario, update_time as updateTime'
    private readonly chatPromptColumn =
        'name, version, role, content, modify_time as modifyTime'
    private readonly chatPresetMessageColumn =
        'id, chat_id, user, assistant, create_time as createTime'
    private readonly chatTopicColumn =
        'id, chat_id as chatId, content, "select", select_time as selectTime, create_time as createTime'

    private readonly cmdHistoryColumn =
        'id, type, key, last_switch_time as lastSwitchTime, frequency'
    private readonly mcpToolsColumn =
        'id, name, version, tools, create_time as createTime, update_time as updateTime'

    private readonly chatConfigExtColumn =
        'id, chat_id as chatId, ext, create_time as createTime, update_time as updateTime'

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

    trans = (fs: RunSql): void => {
        this.db.transaction(fs)()
    }

    chats(): Chat[] {
        return this.db
            .query(`SELECT ${this.chatColumn} FROM chat`)
            .as(Chat)
            .all()
    }

    addChat(name: string): string {
        const now = unixnow()
        const chatId = uuid()
        const statement = this.db.prepare(
            `INSERT INTO chat (id, name, "select", action_time, select_time) VALUES (?, ?, ?, ?, ?)`
        )
        statement.run(chatId, name, false, now, now)
        return chatId
    }

    addConfig(chatId: string, model: Model): void {
        const configStatement = this.db.prepare(
            `INSERT INTO chat_config (id, chat_id, sys_prompt, with_context, context_limit, with_mcp, llm_type, model, scenario_name, scenario, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        const [scenarioName, scenario] = temperature.general
        const { llmType, model: value } = model
        configStatement.run(
            uuid(),
            chatId,
            '',
            true,
            10,
            false,
            llmType,
            value,
            scenarioName,
            scenario,
            unixnow()
        )
    }

    addConfigExt(chatId: string, ext: string): void {
        const now = unixnow()
        this.db
            .prepare(
                `INSERT INTO chat_config_ext (id, chat_id, ext, create_time, update_time) VALUES (?, ?, ?, ?, ?)`
            )
            .run(uuid(), chatId, ext, now, now)
    }

    addPreset(chatId: string, contents: PresetMessageContent[]): void {
        const statement = this.db.prepare(
            `INSERT INTO chat_preset_message (id, chat_id, user, assistant, create_time) VALUES (?, ?, ?, ?, ?)`
        )
        contents.forEach((it) => {
            statement.run(uuid(), chatId, it.user, it.assistant, unixnow())
        })
    }

    addTopic(chatId: string, topicId: string, content: string): void {
        const now = unixnow()
        this.db
            .prepare(
                `INSERT INTO chat_topic (id, chat_id, content, "select", select_time, create_time) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(topicId, chatId, content, true, now, now)
    }

    selectChat(name: string, active: boolean): void {
        this.db
            .prepare('UPDATE chat SET "select" = ? WHERE name = ?')
            .run(active, name)
    }

    unselectTopic(chatId: string): void {
        this.db
            .prepare(
                `UPDATE chat_topic SET "select" = ? where "select" = ? and chat_id = ?`
            )
            .run(false, true, chatId)
    }

    currentChat(): Chat | null {
        return this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE "select" = ?`)
            .as(Chat)
            .get(true)
    }
    currentTopic(chatId: string): ChatTopic | null {
        return this.db
            .query(
                `SELECT ${this.chatTopicColumn} FROM chat_topic WHERE "select" = ? and chat_id = ? limit 1`
            )
            .as(ChatTopic)
            .get(true, chatId)
    }

    selectTopic(topicId: string, active: boolean): void {
        this.db
            .prepare(`UPDATE chat_topic SET "select" = ? where id = ?`)
            .run(active, topicId)
    }

    queryChat(name: string): Chat | null {
        return this.db
            .query(`SELECT ${this.chatColumn} FROM chat WHERE name = ?`)
            .as(Chat)
            .get(name)
    }
    queryConfig(chatId: string): ChatConfig | null {
        return this.db
            .query(
                `SELECT ${this.chatConfigColumn} FROM chat_config WHERE chat_id = ?`
            )
            .as(ChatConfig)
            .get(chatId)
    }
    queryConfigExt(chatId: string): ChatConfigExt | null {
        return this.db
            .prepare(
                `SELECT ${this.chatConfigExtColumn} FROM chat_config_ext WHERE chat_id = ?`
            )
            .as(ChatConfigExt)
            .get(chatId)
    }
    queryPreset(chatId: string): ChatPresetMessage[] {
        return this.db
            .query(
                `SELECT ${this.chatPresetMessageColumn} FROM chat_preset_message WHERE chat_id = ?`
            )
            .as(ChatPresetMessage)
            .all(chatId)
    }

    queryTopic(chatId: string): ChatTopic[] {
        return this.db
            .query(
                `SELECT ${this.chatTopicColumn} FROM chat_topic WHERE chat_id = ?`
            )
            .as(ChatTopic)
            .all(chatId)
    }

    modifySystemPrompt(configId: string, prompt: string): void {
        this.db
            .prepare(
                `UPDATE chat_config SET sys_prompt = ?, update_time = ? where id = ?`
            )
            .run(prompt, unixnow(), configId)
    }
    modifyContextLimit(configId: string, limit: number): void {
        this.db
            .prepare(
                `UPDATE chat_config SET context_limit = ?, update_time = ? where id = ?`
            )
            .run(limit, unixnow(), configId)
    }
    modifyContext(configId: string, active: boolean): void {
        this.db
            .prepare(
                `UPDATE chat_config SET with_context = ?, update_time = ? where id = ?`
            )
            .run(active, unixnow(), configId)
    }
    modifyMcp(configId: string, active: boolean): void {
        this.db
            .prepare(
                `UPDATE chat_config SET with_mcp = ?, update_time = ? where id = ?`
            )
            .run(active, unixnow(), configId)
    }
    modifyScenario(configId: string, scenario: Scenario): void {
        const { name, value } = scenario
        this.db
            .prepare(
                `UPDATE chat_config SET scenario_name = ?, scenario = ?, update_time = ? where id = ?`
            )
            .run(name, value, unixnow(), configId)
    }
    modifyModel(configId: string, model: Model): void {
        const { llmType, model: value } = model
        this.db
            .prepare(
                `UPDATE chat_config SET llm_type = ?, model = ?, update_time = ? where id = ?`
            )
            .run(llmType, value, unixnow(), configId)
    }
    updateConfigExt(chatId: string, ext: string): void {
        this.db
            .prepare(
                `UPDATE chat_config_ext SET ext = ?, update_time = ? WHERE chat_id = ?`
            )
            .run(ext, unixnow(), chatId)
    }

    delPreset(chatId: string): void {
        this.db
            .prepare(`DELETE FROM chat_preset_message WHERE chat_id = ?`)
            .run(chatId)
    }

    delChat(chatId: string): void {
        this.db.prepare(`DELETE FROM chat WHERE id = ?`).run(chatId)
    }

    delConfig(chatId: string): void {
        this.db.prepare(`DELETE FROM chat_config WHERE chat_id = ?`).run(chatId)
    }

    delConfigExt(chatId: string): void {
        this.db
            .prepare(`DELETE FROM chat_config_ext WHERE chat_id = ?`)
            .run(chatId)
    }

    delChatTopic(chatId: string): void {
        this.db.prepare(`DELETE FROM chat_topic WHERE chat_id = ?`).run(chatId)
    }

    delMessage(topicId: string): void {
        this.db
            .prepare(`DELETE FROM chat_message WHERE topic_id = ?`)
            .run(topicId)
    }

    queryMessage(
        topicId: string,
        limit: number,
        withReasoning?: boolean
    ): ChatMessage[] {
        return this.db
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
            .all(topicId, limit)
    }

    saveMessage(messages: MessageContent[]) {
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

    queryCmdHis(type: CmdHistoryType, key: string) {
        return this.db
            .query(
                `SELECT ${this.cmdHistoryColumn} FROM cmd_history WHERE type = ? and key like ?`
            )
            .as(CmdHistory)
            .all(type, `%${key}%`)
    }

    getCmdHis(type: CmdHistoryType, key: string) {
        return this.db
            .query(
                `SELECT ${this.cmdHistoryColumn} FROM cmd_history WHERE type = ? and key = ?`
            )
            .as(CmdHistory)
            .get(type, key)
    }

    addCmdHis(type: CmdHistoryType, key: string) {
        this.db
            .prepare(
                `INSERT INTO cmd_history (id, type, key, last_switch_time, frequency) VALUES (?, ?, ?, ?, ?)`
            )
            .run(uuid(), type, key, unixnow(), 1)
    }

    delCmdHis(type: CmdHistoryType, key: string) {
        this.db
            .prepare(`DELETE FROM cmd_history WHERE type = ? and key = ?`)
            .run(type, key)
    }

    updateCmdHis(type: CmdHistoryType, key: string, frequency: number) {
        this.db
            .prepare(
                `UPDATE cmd_history SET last_switch_time = ?, frequency = ? WHERE type = ? and key = ?`
            )
            .run(unixnow(), frequency + 1, type, key)
    }

    addOrUpdateCmdHis(type: CmdHistoryType, key: string) {
        const h = this.getCmdHis(type, key)
        if (h) {
            this.updateCmdHis(type, key, h.frequency)
            return
        }
        this.addCmdHis(type, key)
    }

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

    searchPrompt(name: string, version?: string): ChatPrompt[] {
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

    listPrompt(): ChatPrompt[] {
        return this.db
            .query(`SELECT ${this.chatPromptColumn} FROM chat_prompt`)
            .as(ChatPrompt)
            .all()
    }

    queryAllExportMessage(): ExportMessage[] {
        return this.db.query(this.exportMessageSql({})).as(ExportMessage).all()
    }

    queryChatExportMessage(chatId: string): ExportMessage[] {
        return this.db
            .query(this.exportMessageSql({ chatId: true }))
            .as(ExportMessage)
            .all(chatId)
    }

    queryChatTopicExportMessage(
        chatId: string,
        topicId: string
    ): ExportMessage[] {
        return this.db
            .query(this.exportMessageSql({ chatId: true, topicId: true }))
            .as(ExportMessage)
            .all(chatId, topicId)
    }

    private exportMessageSql(p: {
        chatId?: boolean
        topicId?: boolean
    }): string {
        const { chatId, topicId } = p
        const arr: string[] = []
        if (chatId) {
            arr.push('c.id = ?')
        }
        if (topicId) {
            arr.push('t.id = ?')
        }
        let where = ''
        if (arr.length > 0) {
            where = `where ${arr.join(' and ')}`
        }
        return `
            select 
            	c.name as chatName,
            	case when f.with_context = 1 then t.content else null end as topicName,
            	max(case when m."role" = 'user' then m.content end) as "user",
            	max(case when m."role" = 'reasoning' then m.content end) as reasoning,
            	max(case when m."role" = 'assistant' then m.content end) as assistant,
            	DATETIME(m.action_time / 1000, 'unixepoch')  as actionTime
            from chat c 
            inner join chat_topic t on c.id = t.chat_id 
            inner join chat_message m on m.topic_id = t.id
            inner join chat_config f on f.chat_id = c.id 
            ${where}
            GROUP by m.pair_key
            order by c.name, t.create_time, m.action_time;
        `
    }

    queryCache(key: string): Cache | null {
        return this.db
            .prepare(`SELECT key, value FROM cache WHERE key = ?`)
            .as(Cache)
            .get(key)
    }

    saveOrUpdateCache(cache: Cache): void {
        const { key, value } = cache
        const v = this.queryCache(key)
        if (v) {
            this.db
                .prepare(`UPDATE cache SET value = ? WHERE key = ?`)
                .run(value, key)
            return
        }
        this.db
            .prepare(`INSERT INTO cache (key, value) VALUES (?, ?)`)
            .run(key, value)
    }

    deleteCache(key: string): void {
        this.db.prepare(`DELETE FROM cache WHERE key = ?`).run(key)
    }

    appSetting(): AppSetting | null {
        return this.db
            .query(
                `SELECT ${this.appSettingColumn} FROM app_setting order by create_time desc limit 1`
            )
            .as(AppSetting)
            .get()
    }

    addAppSetting(setting: AppSettingContent): void {
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
}
