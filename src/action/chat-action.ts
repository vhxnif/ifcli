import { nanoid } from "nanoid";
import { bold, error, green, mauve, pink, print, println, selectRun, yellow } from '../util/common-utils';
import { CHAT_DEFAULT_SYSTEM } from "../config/prompt";
import type { IChatAction } from "../types/action-types";
import type { ILLMClient } from "../types/llm-types";
import type { IChatStore, ChatMessage, Chat } from "../types/store-types";
import { isEmpty } from "lodash";

export class ChatAction implements IChatAction {

    client: ILLMClient
    store: IChatStore

    constructor(client: ILLMClient, store: IChatStore) {
        this.client = client
        this.store = store
    }
    private number = pink
    private keyword = yellow
    private notice = green
    private text = mauve

    private defaultChatName = 'Default'
    init = () => {
        this.store.init()
        if (this.store.queryChat(this.defaultChatName)) {
            return
        }
        this.newChat(this.defaultChatName)
    }

    newChat = (name: string) => {
        if (this.store.queryChat(name)) {
            this.store.changeChat(name)
            return
        }
        this.store.newChat(name, CHAT_DEFAULT_SYSTEM, this.client.chatModel())
        this.printChats()
    }

    removeChat = () => {
        const cts = this.store.chats()
        if (cts.length == 1) {
            println(error('A chat must be keept.'))
            return
        }
        this.selectChatRun(
            'Delete Chat:',
            cts.filter(it => !it.select),
            answer => this.store.removeChat(answer)
        )
    }

    ask = async (content: string) => {
        this.store.contextRun(async cf => {
            const arr: string[] = []
            await this.client.stream(
                this.messages(content, cf.sysPrompt, cf.withContext),
                cf.model,
                c => {
                    print(this.text(c))
                    arr.push(c)
                }
            )
            this.storeMessage(content, arr.join(''))
        })
    }

    changeChat = () => this.selectChatRun(
        'Select Chat:',
        this.store.chats(),
        this.store.changeChat
    )

    printChats = () => {
        this.sortedChats().then(chats =>
            chats.forEach((it, idx) => {
                println(`[${idx === 0 ? green('*') : this.number(idx)}] ${it.select ? this.keyword(it.name) : this.text(it.name)}`)
            })
        )
    }

    clearChatMessage = () => this.store.clearMessage()

    printCurrentConfig = () => {
        this.store.contextRun((cf) => {
            const display = (key: string, vaule: string) => { return `${yellow(bold(key))} ${green(vaule)}` }
            [
                display('With Context:', cf.withContext ? 'true' : 'false'),
                display('Context Size:', cf.contextLimit.toString()),
                display('Current Model:', cf.model),
                `${yellow(bold('System Prompt:'))}`,
                `${this.text(cf.sysPrompt)}`,
            ].forEach(it => println(it))
        })
    }

    printHistory = () => {
        const msg = this.store.historyMessage(10).reduce((acc: Record<string, ChatMessage[]>, item) => {
            if (!acc[item.pairKey]) {
                acc[item.pairKey] = []
            }
            acc[item.pairKey].push(item)
            return acc
        }, {})
        const choices = Object.keys(msg).flatMap(key => msg[key].filter(it => it.role === 'user').map(it => ({ name: it.content, value: key })))
        if(isEmpty(choices)) {
            println(error(`History Questions is Empty.`))
            return
        }
        selectRun(
            'History Questions:',
            choices,
            answer => print(this.text(msg[answer].find(it => it.role === 'assistant')?.content))
        )
    }

    modifyContextSize = (size: number) => {
        this.store.modifyContextLimit(size)
    }

    modifyModel = () => selectRun(
        'Select Model:',
        [this.client.chatModel(), this.client.coderModel()].map(it => ({ name: it, value: it })),
        answer => this.store.modifyModel(answer)
    )

    modifySystemPrompt = (prompt: string) => {
        this.store.modifySystemPrompt(prompt)
    }

    modifyWithContext = () => this.store.modifyWithContext()

    private selectChatRun = async (message: string, chats: Chat[], f: (str: string) => void) => selectRun(message, chats.map(it => ({ name: it.name, value: it.name, })), f)

    private messages = (content: string, prompt: string, withContext: boolean) => {
        const context = withContext ? this.store.contextMessage().map(it => {
            if (it.role === 'user') {
                return this.client.user(it.content)
            }
            return this.client.assistant(it.content)
        }) : []
        return [this.client.system(prompt), ...context, this.client.user(content)]
    }

    private storeMessage = (userContent: string, assistantContent: string): void => {
        const pairKey = nanoid()
        this.store.saveMessage([
            { role: 'user', content: userContent, pairKey },
            { role: 'assistant', content: assistantContent, pairKey }
        ])
    }

    private sortedChats = async (): Promise<Chat[]> => {
        const cts = this.store.chats()
        const [st, oths] = await Promise.all([
            cts.find(it => it.select),
            cts.filter(it => !it.select).sort((a, b) => Number(b.actionTime) - Number(a.actionTime))
        ])
        return [st!, ...oths]
    }

}