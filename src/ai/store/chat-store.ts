import { isEmpty } from 'lodash'
import { nanoid } from 'nanoid'
import { unixnow } from '../../util/common-utils'
import { db } from '../sqlite-client'

export class Chat {
    id!: string
    name!: string
    select!: boolean
    actionTime!: bigint
    selectTime!: bigint
}

export class ChatMessage {
    id!: string
    chatId!: string
    role!: string
    content!: string
    actionTime!: bigint
}

export class ChatConfig {
    id!: string
    chatId!: string
    sysPrompt!: string
    withContext!: boolean
    contextLimit!: number
    model!: string
    updateTime!: bigint
}
// ---- chat ---- 
const chatSelectColumn = 'id, name, "select", action_time as actionTime, select_time as selectTime'


const getChat = (name: string): Chat | null => {
    return db.query(`SELECT ${chatSelectColumn} FROM chat WHERE name = ?`).as(Chat).get(name)
}

const chats = (): Chat[] => {
    return db.query(`SELECT ${chatSelectColumn} FROM chat`).as(Chat).all()
}

const _chatExistsRun = <T>(name: string, f: (chat: Chat) => T): T => {
    const c = getChat(name)
    if (c) {
        return f(c)
    }
    throw Error(`chat: ${name} not exists.`)
}

const _chatNotExistsRun = <T>(name: string, f: () => T): T => {
    const c = getChat(name)
    if (c) {
        throw Error(`chat: ${name} exists.`)
    }
    return f()
}

const deleteChat = (name: string): void => {
    _chatExistsRun(name, c => {
        db.prepare(`DELETE FROM chat WHERE id = ?`).run(c.id)
    })
}

const modifyChatName = (name: string, newName: string): void => {
    _chatExistsRun(name, c => {
        _chatNotExistsRun(newName, () => {
            db.prepare('UPDATE chat SET name = ? WHERE id = ?').run(newName, c.id)
        })
    })
}

const selectedChat = (): Chat | null => {
    return db.query(`SELECT ${chatSelectColumn} FROM chat WHERE "select" = ?`).as(Chat).get(true)
}

const selectedChatRun = <T>(f: (chat: Chat) => T): T => {
    const c = selectedChat()
    if (c) {
        return f(c)
    }
    throw Error('selected chat not exists.')
}

const modifySelect = (name: string, select: boolean): void => {
    _chatExistsRun(name, c => {
        db.prepare('UPDATE chat SET "select" = ? WHERE id = ?').run(select, c.id)
    })
}

const selectChat = (name: string): void => {
    _chatExistsRun(name, c => {
        if (c.select) {
            return
        }
        selectedChatRun(s => {
            transaction(() => {
                modifySelect(s.name, false)
                modifySelect(c.name, true)
            })
        })
    })
}

const addChat = (name: string): string => {
    return _chatNotExistsRun(name, () => {
        const now = unixnow()
        const chatId = nanoid()
        const statement = db.prepare(`INSERT INTO chat (id, name, "select", action_time, select_time) VALUES (?, ?, ?, ?, ?)`)
        transaction(() => {
            const c = selectedChat()
            if (c) {
                modifySelect(c.name, false)
            }
            statement.run(chatId, name, true, now, now)
        })
        return chatId
    })
}

// ---- chat config ----

const chatConfigSelectColumn = 'id, chat_id as chatId , sys_prompt as sysPrompt, with_context as withContext, context_limit as contextLimit, model, update_time as updateTime'

const systemDefaultConfig = (sysPrompt: string, withContext: boolean, contextLimit: number, model: string): void => {
    const chat = selectedChat()
    if (isEmpty(chat)) {
        throw Error(`selected chat not exists.`)
    }
    const config = queryChatConfigById(chat.id)
    if (isEmpty(config)) {
        db.prepare(`INSERT INTO chat_config (id, chat_id, sys_prompt, with_context, context_limit, model, update_time) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(nanoid(), chat.id, sysPrompt, withContext, contextLimit, model, unixnow())
        return
    }
    throw Error(`selected chat config exists.`)
}

const modifySysPrompt = (sysPrompt: string): void => {
    selectedChatConfigRun((_, cf) => {
        db.prepare(`UPDATE chat_config SET sys_prompt = ?, update_time = ? where id = ?`).run(sysPrompt, unixnow(), cf.id)
    })
}

const modifyContextLimit = (contextLimit: number): void => {
    selectedChatConfigRun((_, cf) => {
        db.prepare(`UPDATE chat_config SET context_limit = ?, update_time = ? where id = ?`).run(contextLimit, unixnow(), cf.id)
    })
}

const modifyModel = (model: string): void => {
    selectedChatConfigRun((_, cf) => {
        db.prepare(`UPDATE chat_config SET model = ?, update_time = ? where id = ?`).run(model, unixnow(), cf.id)
    })
}

const changeWithContext = (): void => {
    selectedChatConfigRun((_, cf) => {
        db.prepare(`UPDATE chat_config SET with_context = ?, update_time = ? where id = ?`).run(!cf.withContext, unixnow(), cf.id)
    })
}

const selectedChatConfigRun = <T>(f: (ct: Chat, cf: ChatConfig) => T): T => {
    return selectedChatRun(c => {
        const config = queryChatConfigById(c.id)
        if (isEmpty(config)) {
            throw Error(`selected chat config is missing.`);
        }
        return f(c, config)
    })
}

const queryChatConfigById = (id: string): ChatConfig | null => {
    return db.query(`SELECT ${chatConfigSelectColumn} FROM chat_config WHERE chat_id = ?`).as(ChatConfig).get(id)
}
const queryChatConfigByChatName = (chatName: string): ChatConfig | null => {
    return db.query(`SELECT ${chatConfigSelectColumn} FROM chat_config WHERE chat_id = (SELECT id FROM chat WHERE name = ? Limit 1)`).as(ChatConfig).get(chatName)
}

const deleteChatConfig = (chatId: string): void => {
    db.prepare(`DELETE FROM chat_config WHERE chat_id = ?`).run(chatId)
}

// ---- chat message ---- 
const chatMessageSelectColumn = 'id, chat_id as chatId, "role", content, action_time as actionTime'

const addMessage = (messages: { role: string, content: string }[]): void => {
    selectedChatRun(c => {
        const statement = db.prepare(`INSERT INTO chat_message (id, chat_id, "role", content, action_time) VALUES (?, ?, ?, ?, ?)`)
        transaction(() => {
            messages
                .filter(it => !isEmpty(it.role) && !isEmpty(it.content))
                .map(it => [nanoid(), c.id, it.role, it.content, unixnow()])
                .forEach(it => statement.run(...it))
        })
    })
}

const deleteChatMessage = (chatId: string): void => {
    db.prepare(`DELETE FROM chat_message WHERE chat_id = ?`).run(chatId)
}

// contextMessages
const contextMessages = (): ChatMessage[] => {
    return selectedChatConfigRun((c, cf) => {
        return db.query(`SELECT ${chatMessageSelectColumn} FROM chat_message WHERE chat_id = ? Limit ?`).as(ChatMessage).all(c.id, cf.contextLimit)
    })
}

const transaction = (f: () => void) => {
    db.transaction(f)()
}

export {
    addChat, deleteChat, chats, getChat, selectChat,
    addMessage, contextMessages, deleteChatMessage, deleteChatConfig,
    modifyChatName, modifyContextLimit, modifySysPrompt, systemDefaultConfig, modifyModel, changeWithContext,
    selectedChat, selectedChatConfigRun, selectedChatRun, queryChatConfigByChatName,
    transaction,
}


