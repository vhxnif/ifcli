import { default as hisMsgDisplay } from '../component/llm-his-msg-prompt'
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
import { AppSettingParse } from '../config/app-setting'
import { assistant, system, user } from '../llm/llm-utils'
import {
    Chat,
    type ChatConfig,
    type IChatStore,
    type MessageContent,
    type PresetMessageContent
} from '../types/store-types'
import { color, display, wrapAnsi } from '../util/color-utils'
import { editor, error, isEmpty, println, uuid } from '../util/common-utils'
import { input, select, selectRun } from '../util/inquirer-utils'
import { printTable, tableConfig, tableConfigWithExt } from '../util/table-util'

export class ChatAction implements IChatAction {
    clientMap: Map<string, ILLMClient> = new Map()
    store: IChatStore
    mcps: MCPClient[]

    constructor({
        llmClients,
        mcpClients,
        store,
    }: {
        llmClients: ILLMClient[]
        mcpClients: MCPClient[]
        store: IChatStore
    }) {
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
        const llm = await select({
            message: 'Select A Provider',
            choices: Array.from(this.clientMap.keys()).map((it) => ({
                name: it as string,
                value: it as string,
            })),
        })
        if (!llm) {
            throw Error('At least one provider must be selected.')
        }
        const llmSelect = this.clientMap.get(llm)!
        const model = await select({
            message: 'Select A Model',
            choices: llmSelect.models.map((it) => ({ name: it, value: it })),
        })
        if (!model) {
            throw Error('At least one model must be selected.')
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

    removeChat = () => {
        const cts = this.store.chats()
        if (cts.length == 1) {
            error('At least one chat must remain.')
            return
        }
        this.selectChatRun(
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
                error(`${chatName} is missing.`)
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
                    display.caution('WithContext:'),
                    display.important(booleanPrettyFormat(cf.withContext)),
                    display.caution('Interactive:'),
                    display.important(
                        booleanPrettyFormat(cf.interactiveOutput)
                    ),
                ],
                [
                    display.caution('Scenario:'),
                    display.tip(cf.scenarioName),
                    display.caution('ContextSize:'),
                    display.warning(cf.contextLimit),
                ],
                [
                    display.caution('LLMType & Model:'),
                    display.tip(`${cf.llmType}\n${cf.model}`),
                    display.caution('WithMCP:'),
                    display.important(booleanPrettyFormat(cf.withMCP)),
                ],
                [
                    wrapAnsi(
                        display.note,
                        isEmpty(cf.sysPrompt)
                            ? 'The system prompt has not been configured.'
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

    modifyInteractiveOutput = () => {
        this.store.modifyInteractiveOutput()
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
            error('Current Chat Prompt Missing.')
            return
        }
        await this.getPublishPromptInput(prompt)
    }

    selectPrompt = async (name: string) => {
        const prompts = this.store.searchPrompt(name)
        if (isEmpty(prompts)) {
            throw Error('No Match Prompts.')
        }
        await selectRun(
            'Select Prompt:',
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
            error('Preset Message Not Set.')
            return
        }
        println(presetMessageText.content)
    }

    editPresetMessage = async () => {
        const sourceText = this.presetMessageText({}).content
        const text = await editor(sourceText)
        if (!text) {
            return
        }
        if (this.isTextSame(sourceText, text)) {
            error('Nothing Edited')
            return
        }
        const contents = this.parsePresetMessageText(text)
        this.store.createPresetMessage(contents)
    }

    setting = async () => {
        const st = this.store.appSetting()!
        const parse = new AppSettingParse(st)
        const sourceText = parse.editShow()
        const text = await editor(sourceText, 'json')
        if (!text) {
            return
        }
        if (this.isTextSame(sourceText, text)) {
            error('Setting Not Change.')
            return
        }

        const add = parse.editParse(text)
        if (!add) {
            return
        }
        this.store.addAppSetting(add)
    }

    private isTextSame = (sourceText: string, text: string) => {
        const hasher = new Bun.CryptoHasher('sha256')
        const digest = (str: string) => {
            hasher.update(str)
            return hasher.digest().toString()
        }
        return digest(sourceText) === digest(text)
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
        const [st, oths] = await Promise.all([
            cts.find((it) => it.select),
            cts
                .filter((it) => !it.select)
                .sort((a, b) => Number(b.actionTime) - Number(a.actionTime)),
        ])
        return [st!, ...oths]
    }

    private llmParam = (userMessage: string, config: ChatConfig) => {
        const { sysPrompt, withContext, interactiveOutput, model, scenario } =
            config
        const messages = this.messages(userMessage, sysPrompt, withContext)
        return {
            userMessage: user(userMessage),
            interactiveOutput,
            messages,
            model,
            temperature: scenario,
        } as LLMParam
    }
}
