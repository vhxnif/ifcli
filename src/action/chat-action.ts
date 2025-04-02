import { isEmpty } from 'lodash'
import { CHAT_DEFAULT_SYSTEM } from '../config/prompt'
import type { IChatAction } from '../types/action-types'
import type { IConfig } from '../types/config-types'
import { temperature } from '../types/constant'
import type {
    ILLMClient,
    LLMMessage,
    LLMParam,
    LLMResult,
    LLMStreamParam,
} from '../types/llm-types'
import MCPClient from '../types/mcp-client'
import { default as hisMsgDisplay } from '../component/llm-his-msg-prompt'

import {
    Chat,
    type ChatConfig,
    type IChatStore,
    type MessageContent,
    type PresetMessageContent,
} from '../types/store-types'
import { color, display } from '../util/color-utils'
import { editor, error, exit, println, uuid } from '../util/common-utils'
import { printTable, tableConfig } from '../util/table-util'
import { input, select, selectRun } from '../util/inquirer-utils'
import type { LLMType } from '../config/app-llm-config'

export class ChatAction implements IChatAction {
    clientMap: Map<LLMType, ILLMClient> = new Map()
    store: IChatStore
    config: IConfig

    constructor(clients: ILLMClient[], store: IChatStore, config: IConfig) {
        this.store = store
        this.config = config
        clients.forEach((it) => this.clientMap.set(it.type, it))
    }
    private text = color.mauve
    private client = async () => {
        const getClient = () => {
            const config = this.store.chatConfig()
            return this.clientMap.get(config.llmType as LLMType)
        }
        const ct = getClient()
        if (!ct) {
            await this.modifyLLMAndModel()
        }
        return getClient()!
    }

    private selectLLmAndModel = async (): Promise<[LLMType, string]> => {
        const llm = await select({
            message: 'Select A Provider',
            choices: Array.from(this.clientMap.keys()).map((it) => ({
                name: it as string,
                value: it as string,
            })),
        })
        if (!llm) {
            exit()
        }
        const llmSelect = this.clientMap.get(llm as LLMType)!
        llmSelect.models()
        const model = await select({
            message: 'Select A Model',
            choices: llmSelect.models().map((it) => ({ name: it, value: it })),
        })
        if (!model) {
            exit()
        }
        return [llm as LLMType, model]
    }

    init = () => {
        this.store.init()
    }

    newChat = async (name: string) => {
        if (this.store.queryChat(name)) {
            this.store.changeChat(name)
            return
        }
        const [llm, model] = await this.selectLLmAndModel()
        this.store.newChat(name, CHAT_DEFAULT_SYSTEM, llm, model)
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
            const client = await this.client()
            const { tools, userMessage } = this.extractTools(content)
            const llmParam = await this.llmParam(userMessage, cf)
            const streamParam = {
                ...llmParam,
                messageStore: this.storeMessage,
            } as LLMStreamParam
            const streamRun = () => client.stream(streamParam)
            const toolsRun = (mcpClients: MCPClient[]) =>
                client.callWithTools({
                    ...streamParam,
                    mcpClients: mcpClients,
                })
            if (isEmpty(tools)) {
                await streamRun()
                return
            }
            const usefulTools = await this.userUseTools(tools)
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
                    `[${idx === 0 ? color.green('*') : color.pink(idx)}] ${
                        it.select ? color.yellow(it.name) : this.text(it.name)
                    }`
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
                [
                    display.caution('CurrentModle:'),
                    display.tip(`${cf.llmType}#${cf.model}`),
                ],
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

    printChatHistory = async (limit: number) => {
        const messages = this.store.historyMessage(limit)
        if (isEmpty(messages)) {
            error('History Message is Empty.')
            return
        }
        await hisMsgDisplay({
            messages,
        })
    }

    modifyContextSize = (size: number) => {
        this.store.modifyContextLimit(size)
        this.printChatConfig()
    }

    modifyModel = async () => {
        await this.modifyLLMAndModel()
        this.printChatConfig()
    }

    private modifyLLMAndModel = async () => {
        const [llm, model] = await this.selectLLmAndModel()
        this.store.modifyModel(llm, model)
    }

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

    usefulTools = async () => {
        const tools = (await this.client()).mcpClients().reduce(
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

    prompt = () => {
        return this.store.chatConfig().sysPrompt
    }

    clearPresetMessage = () => {
        this.store.clearPresetMessage()
    }

    printPresetMessage = () => {
        const presetMessageText = this.presetMessageText({ colorful: true })
        if(presetMessageText.isDefault) {
            error('Preset Message Not Set.')
            return
        }
        println(presetMessageText.content)
    }

    editPresetMessage = async () => {
        const hasher = new Bun.CryptoHasher('sha256')
        const digest = (str: string) => {
            hasher.update(str)
            return hasher.digest().toString()
        }
        const sourceText = this.presetMessageText({}).content
        const text = await editor(sourceText)
        if (!text) {
            return
        }
        if (digest(sourceText) === digest(text)) {
            error('Nothing Edited')
            return
        }
        const contents = this.parsePresetMessageText(text)
        this.store.createPresetMessage(contents)
    }

    private presetMessageText = ({
        colorful = false,
    }: {
        colorful?: boolean
    }): {
        isDefault: boolean,
        content: string,
    } => {
        const userType = () => `${colorful ? color.mauve.bold('user') : 'user'}`
        const assistantType = () =>
            `${colorful ? color.yellow.bold('assistant') : 'assistant'}`
        const pairMessage = (user: string, assistant: string) =>
            `[${userType()}]\n${user}\n\n[${assistantType()}]\n${assistant}\n`
        const presetMessages = this.store.selectPresetMessage()
        if (isEmpty(presetMessages)) {
            const dfText = pairMessage(
                '<user message content>',
                '<assistant message content>'
            )
            return {
                isDefault: true,
                content: dfText,
            }
        }
        const text = presetMessages
            .map((it) => pairMessage(it.user, it.assistant))
            .join('\n')
        return {
            isDefault: false,
            content: text
        }
    }

    private parsePresetMessageText = (text: string) => {
        type TmpContent = {
            user: string[]
            assistant: string[]
            type?: 'user' | 'assistant'
        }
        const parseContent = (str: string[]) => str.join('\n').trim()
        const toPresetMessageContent = (c: TmpContent) =>
            ({
                user: parseContent(c.user),
                assistant: parseContent(c.assistant),
            } as PresetMessageContent)
        const validContent = (c: TmpContent) =>
            c.type && !isEmpty(c.user) && !isEmpty(c.assistant)
        return text
            .split('\n')
            .reduce((arr, it) => {
                const newItem = () => {
                    arr.push({ user: [], assistant: [] })
                }
                const tail = () => {
                    if (isEmpty(arr)) {
                        newItem()
                    }
                    return arr[arr.length - 1]
                }
                const setType = (str: 'user' | 'assistant') => {
                    tail().type = str
                }
                const appendContent = (str: string) => {
                    const t = tail()
                    if ('user' === t?.type) {
                        t.user.push(str)
                    }
                    if ('assistant' === t?.type) {
                        t.assistant.push(str)
                    }
                }
                if (it === '[user]') {
                    newItem()
                    setType('user')
                    return arr
                }
                if (it === '[assistant]') {
                    setType('assistant')
                    return arr
                }
                appendContent(it)
                return arr
            }, [] as TmpContent[])
            .filter(validContent)
            .map(toPresetMessageContent)
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

    private messages = async (
        content: string,
        prompt: string,
        withContext: boolean
    ) => {
        const client = await this.client()
        const context = withContext
            ? this.store.contextMessage().map((it) => {
                  if (it.role === 'user') {
                      return client.user(it.content)
                  }
                  return client.assistant(it.content)
              })
            : []
        const presetMessage = this.store.selectPresetMessage().flatMap(
            (it) =>
                [
                    { role: 'user', content: it.user },
                    { role: 'assistant', content: it.assistant },
                ] as LLMMessage[]
        )
        const msg = [...presetMessage, ...context, client.user(content)]
        if (isEmpty(prompt)) {
            return msg
        }
        return [client.system(prompt), ...msg]
    }

    private storeMessage = (result: LLMResult): void => {
        const { userContent, assistantContent, thinkingReasoning } = result
        const pairKey = uuid()
        const messages: MessageContent[] = [
            { role: 'user', content: userContent, pairKey },
            { role: 'assistant', content: assistantContent, pairKey },
        ]
        if (thinkingReasoning) {
            messages.push({
                role: 'reasoning',
                content: thinkingReasoning,
                pairKey,
            })
        }
        this.store.saveMessage(messages)
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

    private userUseTools = async (tools: string[]) => {
        const clients = (await this.client()).mcpClients()
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

    private llmParam = async (userMessage: string, config: ChatConfig) => {
        const { sysPrompt, withContext, model, scenario } = config
        const messages = await this.messages(
            userMessage,
            sysPrompt,
            withContext
        )
        return {
            messages,
            model,
            temperature: scenario,
        } as LLMParam
    }
}
