import type { AskContent, IChatAction } from '../types/action-types'
import { temperature } from '../types/constant'
import type {
    ILLMClient,
    LLMMessage,
    LLMParam,
    LLMResult,
    LLMStreamParam,
} from '../types/llm-types'
import MCPClient from '../types/mcp-client'

import type { TableUserConfig } from 'table'
import { assistant, system, user } from '../llm/llm-utils'
import {
    Chat,
    ChatMessage,
    type ChatConfig,
    type IChatStore,
    type MessageContent,
    type PresetMessageContent,
} from '../types/store-types'
import { color, display, wrapAnsi } from '../util/color-utils'
import {
    editor,
    error,
    groupBy,
    isEmpty,
    isTextSame,
    print,
    println,
    uuid,
} from '../util/common-utils'
import { input, select, selectRun, type Choice } from '../util/inquirer-utils'
import { terminal } from '../util/platform-utils'
import { printTable, tableConfig, tableConfigWithExt } from '../util/table-util'
import type { GeneralSetting } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'

export class ChatAction implements IChatAction {
    private clientMap: Map<string, ILLMClient> = new Map()
    private store: IChatStore
    private mcps: MCPClient[]
    private generalSetting: GeneralSetting

    constructor({
        generalSetting,
        llmClients,
        mcpClients,
        store,
    }: {
        generalSetting: GeneralSetting
        llmClients: ILLMClient[]
        mcpClients: MCPClient[]
        store: IChatStore
    }) {
        this.generalSetting = generalSetting
        this.store = store
        llmClients.forEach((it) => this.clientMap.set(it.type, it))
        this.mcps = mcpClients
    }
    private text = color.mauve
    private client = async (llmType?: string) => {
        const getClient = () => {
            if (llmType) {
                return this.clientMap.get(llmType)
            }
            const config = this.store.currentChatConfig()
            return this.clientMap.get(config.llmType)
        }
        const ct = getClient()
        if (!ct) {
            await this.modifyLLMAndModel()
        }
        return getClient()!
    }

    private selectLLmAndModel = async (): Promise<[string, string]> => {
        const choices = Array.from(this.clientMap.keys()).map((it) => ({
            name: it as string,
            value: it as string,
        }))
        if (isEmpty(choices)) {
            throw Error(promptMessage.settingMissing)
        }
        const llm = await select({
            message: 'Provider:',
            choices,
        })
        if (!llm) {
            throw Error(promptMessage.providerMissing)
        }
        const llmSelect = this.clientMap.get(llm)!
        const model = await select({
            message: 'Model',
            choices: llmSelect.models.map((it) => ({ name: it, value: it })),
        })
        if (!model) {
            throw Error(promptMessage.modelMissing)
        }
        return [llm, model]
    }

    newChat = async (name: string) => {
        if (this.store.queryChat(name)) {
            this.store.changeChat(name)
            return
        }
        const [llm, model] = await this.selectLLmAndModel()
        this.store.newChat(name, '', llm, model)
    }

    removeChat = async () => {
        const cts = this.store.chats()
        if (cts.length == 1) {
            throw Error(promptMessage.oneChatRemain)
        }
        await this.selectChatRun(
            'Delete Chat:',
            cts.filter((it) => !it.select),
            (answer) => this.store.removeChat(answer)
        )
    }

    ask = async ({ content, chatName }: AskContent) => {
        const f = async (cf: ChatConfig) => {
            const client = await this.client(cf.llmType)
            const llmParam = this.llmParam(content, cf)
            const streamParam = {
                ...llmParam,
                messageStore: (v) => this.storeMessage(cf.chatId, v),
            } as LLMStreamParam
            const streamRun = async () => await client.stream(streamParam)
            if (!cf.withMCP) {
                await streamRun()
                return
            }
            if (isEmpty(this.mcps)) {
                await streamRun()
                return
            }
            const toolsRun = async (mcpClients: MCPClient[]) =>
                await client.callWithTools({
                    ...streamParam,
                    mcpClients: mcpClients,
                })
            await toolsRun(this.mcps)
        }
        if (chatName) {
            const chat = this.store.queryChat(chatName)
            if (!chat) {
                error(`The ${chatName} not found.`)
                return
            }
            await f(this.store.queryChatConfig(chat.id))
            return
        }
        await f(this.store.currentChatConfig())
    }

    changeChat = () =>
        this.selectChatRun(
            'Select Chat:',
            this.store.chats(),
            this.store.changeChat
        )

    printChats = async () => {
        await this.sortedChats().then((chats) =>
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
        const f = (cf: ChatConfig) => {
            const [ext, myConfig] = tableConfigWithExt({
                cols: [1, 1, 1, 1],
                alignment: 'left',
            })
            const config: TableUserConfig = {
                ...myConfig,
                spanningCells: [
                    { col: 0, row: 3, colSpan: 4, alignment: 'left' },
                ],
            }
            const booleanPrettyFormat = (v: boolean) => (v ? 'true' : 'false')
            const data = [
                [
                    display.caution('Context:'),
                    display.important(booleanPrettyFormat(cf.withContext)),
                    display.caution('MCP:'),
                    display.important(booleanPrettyFormat(cf.withMCP)),
                ],
                [
                    display.caution('Scenario:'),
                    display.tip(cf.scenarioName),
                    display.caution('ContextSize:'),
                    display.warning(cf.contextLimit),
                ],
                [
                    display.caution('LLMType:'),
                    display.tip(cf.llmType),
                    display.caution('Model:'),
                    display.tip(cf.model),
                ],
                [
                    wrapAnsi(
                        display.note,
                        isEmpty(cf.sysPrompt)
                            ? promptMessage.systemPromptMissing 
                            : cf.sysPrompt,
                        ext.colNum
                    ),
                    '',
                    '',
                    '',
                ],
            ]
            printTable(data, config)
        }
        f(this.store.currentChatConfig())
    }

    printChatHistory = async (limit: number) => {
        const messages = this.store.historyMessage(limit)
        if (isEmpty(messages)) {
            throw Error(promptMessage.hisMsgMissing)
        }
        const msp = groupBy(messages, (m: ChatMessage) => m.pairKey)
        const findRole = (role: string) => (arr: ChatMessage[]) => {
            return arr.find((it) => it.role === role)?.content
        }
        const findUser = findRole('user')
        const findAssistant = findRole('assistant')
        const findReasoning = findRole('reasoning')
        const subUserContent = (str: string) => {
            const s = JSON.stringify(str).slice(1, -1)
            if (s.length <= 25) {
                return s
            }
            return `${s.substring(0, 20)}...`
        }
        const choices = msp.entries().reduce((arr, it) => {
            const userContent = findUser(it[1])
            if (!userContent) {
                return arr
            }
            arr.push({ name: subUserContent(userContent), value: it[0] })
            return arr
        }, [] as Choice[])
        const show = async (df?: string) => {
            const value = await select({
                message: 'View Message:',
                choices,
                default: df,
            })
            const msgs = msp.get(value)
            if (!msgs) {
                throw Error(promptMessage.assistantMissing)
            }
            const text = (print: boolean = false) => {
                const reasoning = findReasoning(msgs)
                const assistant = findAssistant(msgs) ?? ''
                if (!reasoning) {
                    if (print) {
                        return color.mauve(assistant)
                    }
                    return assistant
                }
                if (print) {
                    return `${color.green(reasoning)}\n${color.yellow(
                        '='.repeat(terminal.column)
                    )}\n${color.mauve(assistant)}`
                }
                return `**Reasoning: **\n\n${reasoning}\n\n**Assistant: **\n\n${assistant}`
            }
            if (this.generalSetting.interactive) {
                await editor(text())
                if (choices.length <= 1) {
                    return
                }
                await show(value)
                return
            }
            print(text(true))
        }
        await show()
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

    modifyWithMCP = () => {
        this.store.modifyWithMCP()
        this.printChatConfig()
    }

    modifyScenario = async () => {
        await selectRun(
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
        const { sysPrompt } = this.store.currentChatConfig()
        const prompt = sysPrompt
        if (!prompt) {
            throw Error(promptMessage.systemPromptMissing)
        }
        await this.getPublishPromptInput(prompt)
    }

    selectPrompt = async (name: string) => {
        const prompts = this.store.searchPrompt(name)
        if (isEmpty(prompts)) {
            throw Error(promptMessage.systemPromptNoMatching)
        }
        await selectRun(
            'System Prompt:',
            prompts.map((it) => ({ name: it.name, value: it.content })),
            (v) => this.modifySystemPrompt(v)
        )
    }

    usefulTools = async () => {
        const tools = this.mcps.reduce(
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
        return this.store.currentChatConfig().sysPrompt
    }

    clearPresetMessage = () => {
        this.store.clearPresetMessage()
    }

    printPresetMessage = () => {
        const presetMessageText = this.presetMessageText({ colorful: true })
        if (presetMessageText.isDefault) {
            throw Error(promptMessage.presetMsgMissing)
        }
        println(presetMessageText.content)
    }

    editPresetMessage = async () => {
        const sourceText = this.presetMessageText({}).content
        const text = await editor(sourceText)
        if (!text) {
            return
        }
        if (isTextSame(sourceText, text)) {
            throw Error(promptMessage.noEdit)
        }
        const contents = this.parsePresetMessageText(text)
        this.store.createPresetMessage(contents)
    }

    private presetMessageText = ({
        colorful = false,
    }: {
        colorful?: boolean
    }): {
        isDefault: boolean
        content: string
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
            content: text,
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

    private getPublishPromptInput = async (prompt: string) => {
        const name = await input({ message: 'Prompt Name: ' })
        if (isEmpty(name)) {
            await this.getPublishPromptInput(prompt)
            return
        }
        const version = await input({ message: 'Prompt Version: ' })
        if (isEmpty(version)) {
            await this.getPublishPromptInput(prompt)
            return
        }
        const existsPrompt = this.store.searchPrompt(name, version)
        if (isEmpty(existsPrompt)) {
            this.store.publishPrompt(name, version, prompt)
            return
        }
        await this.getPublishPromptInput(prompt)
    }

    private selectChatRun = async (
        message: string,
        chats: Chat[],
        f: (str: string) => void
    ) => {
        if (isEmpty(chats)) {
            throw Error(promptMessage.chatMissing)
        }
        await selectRun(
            message,
            chats.map((it) => ({ name: it.name, value: it.name })),
            f
        )
    }

    private messages = (
        content: string,
        prompt: string,
        withContext: boolean
    ) => {
        const context = withContext
            ? this.store.contextMessage().map((it) => {
                  if (it.role === 'user') {
                      return user(it.content)
                  }
                  return assistant(it.content)
              })
            : []
        const presetMessage = this.store.selectPresetMessage().flatMap(
            (it) =>
                [
                    { role: 'user', content: it.user },
                    { role: 'assistant', content: it.assistant },
                ] as LLMMessage[]
        )
        const msg = [...presetMessage, ...context, user(content)]
        if (isEmpty(prompt)) {
            return msg
        }
        return [system(prompt), ...msg]
    }

    private storeMessage = (chatId: string, result: LLMResult): void => {
        const { userContent, assistantContent, thinkingReasoning } = result
        const pairKey = uuid()
        const messages: MessageContent[] = [
            { chatId, role: 'user', content: userContent, pairKey },
            { chatId, role: 'assistant', content: assistantContent, pairKey },
        ]
        if (thinkingReasoning) {
            messages.push({
                chatId,
                role: 'reasoning',
                content: thinkingReasoning,
                pairKey,
            })
        }
        this.store.saveMessage(messages)
    }

    private sortedChats = async (): Promise<Chat[]> => {
        const cts = this.store.chats()
        if (isEmpty(cts)) {
            throw Error(promptMessage.chatMissing)
        }
        const [st, oths] = await Promise.all([
            cts.find((it) => it.select),
            cts
                .filter((it) => !it.select)
                .sort((a, b) => Number(b.actionTime) - Number(a.actionTime)),
        ])
        return [st!, ...oths]
    }

    private llmParam = (userMessage: string, config: ChatConfig) => {
        const { sysPrompt, withContext, model, scenario } = config
        const messages = this.messages(userMessage, sysPrompt, withContext)
        return {
            userMessage: user(userMessage),
            messages,
            model,
            temperature: scenario,
        } as LLMParam
    }
}
