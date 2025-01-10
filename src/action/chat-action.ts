import { input } from '@inquirer/prompts'
import { isEmpty } from 'lodash'
import { nanoid } from 'nanoid'
import { CHAT_DEFAULT_SYSTEM } from '../config/prompt'
import type { IChatAction } from '../types/action-types'
import type { IConfig } from '../types/config-types'
import type { LLMCallParam, ILLMClient } from '../types/llm-types'
import type {
    Chat,
    ChatConfig,
    ChatMessage,
    IChatStore,
} from '../types/store-types'
import { color, display } from '../util/color-utils'
import {
    error,
    print,
    println,
    printTable,
    selectRun,
    tableConfig,
} from '../util/common-utils'
import { temperature } from '../types/constant'
import MCPClient from '../types/mcp-client'

export class ChatAction implements IChatAction {
    client: ILLMClient
    store: IChatStore
    config: IConfig

    constructor(client: ILLMClient, store: IChatStore, config: IConfig) {
        this.client = client
        this.store = store
        this.config = config
    }
    private text = color.mauve

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
        this.store.newChat(
            name,
            CHAT_DEFAULT_SYSTEM,
            this.client.defaultModel()
        )
        this.printChats()
    }

    removeChat = () => {
        const cts = this.store.chats()
        if (cts.length == 1) {
            error('One chat must be keept.')
            return
        }
        this.selectChatRun(
            'Delete Chat:',
            cts.filter((it) => !it.select),
            (answer) => this.store.removeChat(answer)
        )
    }

    ask = async (content: string) => {
        this.store.contextRun(async (cf) => {
            const { tools, userMessage } = this.extractTools(content)
            const callAndStore = async () =>
                await this.llmRunAndMessageStore(userMessage, cf)
            const streamRun = async () =>
                await callAndStore().then((f) => f(this.client.stream))
            const toolsRun = async (mcpClients: MCPClient[]) =>
                await callAndStore().then((f) =>
                    f(this.client.callWithTools, mcpClients)
                )
            if (isEmpty(tools)) {
                await streamRun()
            }
            const usefulTools = this.userUseTools(tools)
            if (isEmpty(usefulTools)) {
                await streamRun()
                return
            }
            await toolsRun(usefulTools)
        })
    }

    changeChat = () =>
        this.selectChatRun(
            'Select Chat:',
            this.store.chats(),
            this.store.changeChat
        )

    printChats = () => {
        this.sortedChats().then((chats) =>
            chats.forEach((it, idx) => {
                println(
                    `[${idx === 0 ? color.green('*') : color.pink(idx)}] ${it.select ? color.yellow(it.name) : this.text(it.name)}`
                )
            })
        )
    }

    clearChatMessage = () => this.store.clearMessage()

    printChatConfig = () => {
        this.store.contextRun((cf) => {
            const data = [
                [
                    display.caution('WithContext:'),
                    display.important(cf.withContext ? 'true' : 'false'),
                ],
                [
                    display.caution('ContextSize:'),
                    display.warning(cf.contextLimit),
                ],
                [display.caution('CurrentModle:'), display.tip(cf.model)],
                [display.caution('Scenario:'), display.tip(cf.scenarioName)],
                [display.note(cf.sysPrompt), ''],
            ]
            printTable(data, {
                ...tableConfig({ cols: [1, 1] }),
                spanningCells: [
                    { col: 0, row: 4, colSpan: 2, alignment: 'left' },
                ],
            })
        })
    }

    printChatHistory = () => {
        const msg = this.store
            .historyMessage(10)
            .reduce((acc: Record<string, ChatMessage[]>, item) => {
                if (!acc[item.pairKey]) {
                    acc[item.pairKey] = []
                }
                acc[item.pairKey].push(item)
                return acc
            }, {})
        const choices = Object.keys(msg).flatMap((key) =>
            msg[key]
                .filter((it) => it.role === 'user')
                .map((it) => ({ name: it.content, value: key }))
        )
        if (isEmpty(choices)) {
            error(`History Questions is Empty.`)
            return
        }
        selectRun('History Questions:', choices, (answer) =>
            print(
                this.text(
                    msg[answer].find((it) => it.role === 'assistant')?.content
                )
            )
        )
    }

    modifyContextSize = (size: number) => {
        this.store.modifyContextLimit(size)
        this.printChatConfig()
    }

    modifyModel = () =>
        selectRun(
            'Select Model:',
            this.client.models().map((it) => ({ name: it, value: it })),
            (answer) => {
                this.store.modifyModel(answer)
                this.printChatConfig()
            }
        )

    modifySystemPrompt = (prompt: string) => {
        this.store.modifySystemPrompt(prompt)
        this.printChatConfig()
    }

    modifyWithContext = () => {
        this.store.modifyWithContext()
        this.printChatConfig()
    }

    modifyScenario = () => {
        selectRun(
            'Select Scenario:',
            Object.keys(temperature).map((k) => ({
                name: temperature[k][0],
                value: k,
            })),
            (answer) => {
                this.store.modifyScenario(temperature[answer])
                this.printChatConfig()
            }
        )
    }

    publishPrompt = async () => {
        this.store.contextRun(async (cf) => {
            const prompt = cf.sysPrompt
            if (!prompt) {
                error('Current Chat Prompt Missing.')
                return
            }
            this.getPublishPromptInput(prompt)
        })
    }

    selectPrompt = (name: string) => {
        const prompts = this.store.searchPrompt(name)
        if (isEmpty(prompts)) {
            error('No Match Prompts.')
            return
        }
        selectRun(
            'Select Prompt:',
            prompts.map((it) => ({ name: it.name, value: it.content })),
            (v) => this.modifySystemPrompt(v)
        )
    }

    usefulTools = () => {
        const tools = this.client.tools().reduce(
            (arr, it) => {
                return [
                    ...arr,
                    [it.name, it.version].map((s) => display.tip(s)),
                ]
            },
            [['Name', 'Version'].map((it) => display.caution(it))]
        )
        printTable(tools, tableConfig({ cols: [1, 1] }))
    }

    private extractTools = (
        userMessage: string
    ): { tools: string[]; userMessage: string } => {
        const regex = /@[^\s]+/g
        const matches = userMessage.match(regex)
        if (matches) {
            const tools = matches.map((it) => it.replace('@', ''))
            return {
                tools: tools,
                userMessage: tools.reduce(
                    (str, it) => str.replace(it, ''),
                    userMessage
                ),
            }
        }
        return {
            tools: [],
            userMessage: userMessage,
        }
    }

    private getPublishPromptInput = async (prompt: string) => {
        const name = await input({ message: 'Prompt Name : ' })
        const version = await input({ message: 'Prompt Version: ' })
        const existsPrompt = this.store.searchPrompt(name, version)
        if (isEmpty(existsPrompt)) {
            this.store.publishPrompt(name, version, prompt)
            return
        }
        this.getPublishPromptInput(prompt)
    }

    private selectChatRun = async (
        message: string,
        chats: Chat[],
        f: (str: string) => void
    ) =>
        selectRun(
            message,
            chats.map((it) => ({ name: it.name, value: it.name })),
            f
        )

    private messages = (
        content: string,
        prompt: string,
        withContext: boolean
    ) => {
        const context = withContext
            ? this.store.contextMessage().map((it) => {
                  if (it.role === 'user') {
                      return this.client.user(it.content)
                  }
                  return this.client.assistant(it.content)
              })
            : []
        return [
            this.client.system(prompt),
            ...context,
            this.client.user(content),
        ]
    }

    private storeMessage = (
        userContent: string,
        assistantContent: string
    ): void => {
        const pairKey = nanoid()
        this.store.saveMessage([
            { role: 'user', content: userContent, pairKey },
            { role: 'assistant', content: assistantContent, pairKey },
        ])
    }

    private sortedChats = async (): Promise<Chat[]> => {
        const cts = this.store.chats()
        const [st, oths] = await Promise.all([
            cts.find((it) => it.select),
            cts
                .filter((it) => !it.select)
                .sort((a, b) => Number(b.actionTime) - Number(a.actionTime)),
        ])
        return [st!, ...oths]
    }

    private userUseTools = (tools: string[]) => {
        const clients = this.client.tools()
        return tools.reduce((arr, it) => {
            const clientMatch = (mcp: string) => {
                if (mcp.includes(':')) {
                    return (c: MCPClient) => mcp === `${c.name}:${c.version}`
                }
                return (c: MCPClient) => mcp === c.name
            }
            const client = clients.find(clientMatch(it))
            if (client) {
                arr.push(client)
            }
            return arr
        }, [] as MCPClient[])
    }

    private llmRunAndMessageStore = async (
        userMessage: string,
        config: ChatConfig
    ) => {
        const { sysPrompt, withContext, model, scenario } = config
        const llmResArr: string[] = []
        const llmResTextProcess = (c: string) => {
            print(this.text(c))
            llmResArr.push(c)
        }
        const messages = this.messages(userMessage, sysPrompt, withContext)
        return async (
            f: (param: LLMCallParam) => Promise<void>,
            mcpClients?: MCPClient[]
        ) => {
            await f({
                messages,
                model,
                temperature: scenario,
                f: llmResTextProcess,
                mcpClients,
            })
            this.storeMessage(userMessage, llmResArr.join(''))
        }
    }
}
