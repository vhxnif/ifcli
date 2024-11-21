/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    addChat,
    addMessage,
    changeWithContext,
    Chat,
    chats,
    contextMessages,
    deleteChat,
    deleteChatConfig,
    deleteChatMessage,
    getChat,
    modifyContextLimit,
    modifyModel,
    modifySysPrompt,
    queryChatConfigByChatName,
    selectChat,
    selectedChatConfigRun,
    selectedChatRun,
    systemDefaultConfig,
    transaction
} from '../store/chat-store'

import { select, Separator } from '@inquirer/prompts'

import { coderModel, commonModel, roleParam, stream, system, user } from '../open-ai-client'
import { initTable } from '../store/table-def'

import { isEmpty, toNumber } from 'lodash'
import { bold, error, green, mauve, pink, print, println, yellow } from '../../util/common-utils'

const number = pink
const keyword = yellow
const notice = green
const text = mauve

const defaultChatName = 'Default'
const defaultContextLimit = 30
const defaultSysPrompt =
    `
# IDENTITY and PURPOSE

You are skilled at understanding the essence and intent of a question and providing profound responses.

# STEPS

- Deeply understand what's being asked.
- Create a comprehensive mental model of the input and the question on a virtual whiteboard in your mind.
- Answer questions in Markdown format and ensure the response is within 200 words.

# OUTPUT INSTRUCTIONS

- Only output Markdown bullets.
- Chinese is used as the default language.
- Do not output warnings or notes, just the requested sections.
`

const _addChat = (
    chatName: string,
    sysPrompt: string = defaultSysPrompt,
    withContext: boolean = true,
    contextLimit: number = defaultContextLimit,
): void => {
    transaction(() => {
        addChat(chatName)
        systemDefaultConfig(sysPrompt, withContext, contextLimit, commonModel)
    })
}

const _changeOrCreateChat = (chatName: string, customCreate: () => void) => {
    const chat = getChat(chatName)
    if (!chat) {
        customCreate()
        return
    }
    if (chat.select) {
        return
    }
    selectChat(chatName)
}

const _messageMapping = (role: string) => {
    const f = Object.entries(roleParam).find(([k, _]) => k === role)
    if (f) {
        const [_, v] = f
        return v
    }
    throw Error('role type not supported.')
}

const _messages = (content: string, withContext: boolean) => {
    const userMsg = user(content)
    const context = withContext ? contextMessages().map(it => _messageMapping(it.role)?.(it.content)) : []
    const sysMsg = selectedChatConfigRun((_, cf) => system(cf.sysPrompt))
    return [sysMsg, ...context, userMsg]
}

const _storeMessage = (userContent: string, assistantContent: string): void => {
    addMessage([
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent }
    ])
}

const _sortedChats = async (): Promise<Chat[]> => {
    const cts = chats()
    const [st, oths] = await Promise.all([
        cts.find(it => it.select),
        cts.filter(it => !it.select).sort((a, b) => Number(b.actionTime) - Number(a.actionTime))
    ])
    return [st!, ...oths]
}

const _printChat = (chats: Chat[]): void => {
    chats.forEach((it, idx) => {
        println(`[${idx === 0 ? green('*') : number(idx)}] ${it.select ? keyword(it.name) : text(it.name)}`)
    })
}

const _readLine = async (prompt: string, f: (str: string) => Promise<void>): Promise<void> => {
    print(prompt)
    for await (const line of console) {
        await f(line)
        break
    }
}

// --- public ---
const init = (): void => {
    initTable()
    _addChat(defaultChatName)
}

const newChat = async (name: string, useDefault: boolean, copyChat: string | undefined): Promise<void> => {
    const calPrompt = () => {
        if (useDefault) {
            return defaultSysPrompt
        }
        if (copyChat) {
            return queryChatConfigByChatName(copyChat)?.sysPrompt ?? ''
        }
        return ''
    }
    _changeOrCreateChat(name, () => _addChat(name, calPrompt()))
    await chatList()
}

const ask = async (content: string): Promise<void> => {
    selectedChatConfigRun(async (_, cf) => {
        const arr: string[] = []
        await stream(
            _messages(content, cf.withContext),
            cf.model,
            c => {
                print(text(c))
                arr.push(c)
            }
        )
        _storeMessage(content, arr.join(''))
    })
}

const chatList = async (): Promise<void> => {
    await _sortedChats().then(it => _printChat(it))
}

const changeChat = async (): Promise<void> => {
    selectChatRun(
        'Select Chat:',
        await _sortedChats(),
        selectChat
    )
}

const currConfig = (): void => {
    selectedChatConfigRun((_, cf) => {
        const display = (key: string, vaule: string) => { return `${yellow(bold(key))} ${green(vaule)}` }
        [
            display('With Context:', cf.withContext ? 'true' : 'false'),
            display('Context Size:', cf.contextLimit.toString()),
            display('Current Model:', cf.model),
            `${yellow(bold('System Prompt:'))}`,
            `${text(cf.sysPrompt)}`,
        ].forEach(it => println(it))
    })
}

const updateSysPrompt = (pt: string): void => {
    if (isEmpty(pt)) {
        return
    }
    modifySysPrompt(pt)
}

const updateContextSize = (size: string): void => {
    modifyContextLimit(toNumber(size))
}

const models = (): string[] => [commonModel, coderModel]

const updateModel = (model: string): void => {
    if (model === commonModel) {
        return
    }
    if (!models().includes(model)) {
        println(error(`model ${model} not suppprted.`))
        return
    }
    modifyModel(model)
}

const removeChat = async (): Promise<void> => {
    const cts = await _sortedChats()
    if (cts.length == 1) {
        println(error('A chat must be kept.'))
        return
    }
    selectChatRun(
        'Delete Chat:',
        cts.filter(it => !it.select),
        answer => {
            const c = cts.find(it => it.name === answer)!
            transaction(() => {
                deleteChatMessage(c.id)
                deleteChat(c.name)
                deleteChatConfig(c.id)
            })
        }
    )
}

const cleanMessage = (): void => {
    selectedChatRun(c => deleteChatMessage(c.id))
}

const selectChatRun = async (message: string, chats: Chat[], f: (str: string) => void) => {
    const answer = await select({
        message,
        choices: chats.map(it => ({ name: it.name, value: it.name, })),
    })
    f(answer)
}


export { ask, changeChat, changeWithContext, chatList, cleanMessage, currConfig, init, models, newChat, removeChat, updateContextSize, updateModel, updateSysPrompt }


