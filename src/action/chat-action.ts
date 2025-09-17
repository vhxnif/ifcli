/* eslint-disable @typescript-eslint/no-unused-vars */
import { stringWidth } from 'bun'
import { color, display } from '../app-context'
import type { GeneralSetting } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'
import { askFlow } from '../llm/ask-flow'
import { Display } from '../llm/display'
import type { AskContent, IChatAction } from '../types/action-types'
import { temperature } from '../types/constant'
import type { ILLMClient } from '../types/llm-types'
import MCPClient from '../types/mcp-client'
import path from 'path'
import {
    Chat,
    ChatMessage,
    ChatPrompt,
    ChatTopic,
    CmdHistory,
    ExportMessage,
    type Cache,
    type ChatConfig,
    type ConfigExt,
    type IStore,
    type MCPServerKey,
    type PresetMessageContent,
} from '../types/store-types'
import {
    catppuccinColorSchema,
    hex,
    type CatppuccinColorName,
} from '../util/color-schema'
import {
    editor,
    groupBy,
    isEmpty,
    isTextSame,
    print,
    println,
    unixnow,
} from '../util/common-utils'
import {
    input,
    select,
    checkbox,
    selectRun,
    themeStyle,
    type Choice,
} from '../util/inquirer-utils'
import { env, terminal } from '../util/platform-utils'
import { printTable, tableConfig, tableConfigWithExt } from '../util/table-util'
import { TextShow } from '../util/text-show'
import { themes } from '../util/theme'
import writeXlsxFile, { type Schema } from 'write-excel-file/node'

export class ChatAction implements IChatAction {
    private clientMap: Map<string, ILLMClient> = new Map()
    private store: IStore
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
        store: IStore
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

    reAsk = async () => {
        const prevOptions = this.queryCaches(['prev_options'])
        if (isEmpty(prevOptions)) {
            throw Error(promptMessage.retryOptionsMisssing)
        }
        const [it] = prevOptions
        await this.ask(JSON.parse(it.value) as AskContent)
    }

    ask = async (params: AskContent) => {
        this.saveOrUpdateCaches([
            {
                key: 'prev_options',
                value: JSON.stringify(params),
            },
        ])
        const { content, chatName, noStream = false, newTopic } = params
        const f = async (cf: ChatConfig) => {
            const client = await this.client(cf.llmType)
            await askFlow({
                generalSetting: this.generalSetting,
                client: client.openai,
                store: this.store,
                config: cf,
                configExt: this.configExt(cf.chatId),
                userContent: content,
                mcps: this.mcps,
                noStream,
                newTopic,
            })
        }
        if (chatName) {
            const chat = this.getChat(chatName)
            await f(this.store.queryChatConfig(chat.id))
            return
        }
        await f(this.store.currentChatConfig())
    }

    private getChat = (chatName: string) => {
        const chat = this.store.queryChat(chatName)
        if (!chat) {
            throw Error(`The ${chatName} not found.`)
        }
        return chat
    }

    changeChat = async (name?: string) => {
        const f = (s: string) => {
            this.store.changeChat(s)
            print(
                `${color.green('✔')} ${color.subtext0.bold(
                    'Select Chat:'
                )} ${color.teal(s)} `
            )
        }
        if (name && (await this.quikeCmd(name, f))) {
            return
        }
        const chats = this.store.chats()
        if (isEmpty(chats)) {
            throw Error(promptMessage.chatMissing)
        }
        const df = chats.filter((it) => it.select)[0]
        const choices: Choice<string>[] = chats.map((it) => ({
            name: it.name,
            value: it.name,
            disabled: it.select ? ' ' : false,
        }))
        if (isEmpty(choices.filter((it) => !it.disabled))) {
            throw Error(promptMessage.onlyOneChat)
        }
        const v = await select({
            message: 'Select Chat:',
            choices,
            default: df.name,
            theme: themeStyle(color),
        })
        this.store.changeChat(v)
        this.store.addOrUpdateCmdHis('chat_switch', v)
    }

    private quikeCmd = async (
        subkey: string,
        quikeRun: (s: string) => void | Promise<void>
    ) => {
        const cmd = this.store
            .queryCmdHis('chat_switch', subkey)
            .sort((a, b) => this.frequencyRule(b) - this.frequencyRule(a))[0]
        if (!cmd) {
            return false
        }
        const { key, frequency } = cmd
        try {
            const res = quikeRun(key)
            if (res instanceof Promise) {
                await res
            }
            this.store.updateCmdHis('chat_switch', key, frequency)
            return true
        } catch (e: unknown) {
            this.store.delCmdHis('chat_switch', key)
            return false
        }
    }

    private frequencyRule(it: CmdHistory): number {
        const { lastSwitchTime, frequency } = it
        const lastHour = 36001000
        const lastDay = 86400000
        const lastWeek = 604800000
        const duration = Date.now() - lastSwitchTime
        if (duration <= lastHour) {
            return frequency * 4
        }
        if (duration <= lastDay) {
            return frequency * 2
        }
        if (duration <= lastWeek) {
            return frequency / 2
        }
        return frequency / 4
    }

    changeTopic = async () => {
        const topics = this.store.currentChatTopics()
        const choices: Choice<ChatTopic>[] = topics.map((it) => ({
            name: this.subStr(it.content),
            value: it,
            description: this.descriptionTrim(it.content),
            disabled: it.select ? ' ' : false,
        }))
        if (isEmpty(choices.filter((it) => !it.disabled))) {
            throw Error(promptMessage.onlyOneTopic)
        }
        const { id, chatId } = await select({
            message: 'Select Topic:',
            choices,
            theme: themeStyle(color),
        })
        this.store.changeTopic(id, chatId)
    }

    printTopics = async () => {
        await this.sortedTopics().then((it) =>
            this.listItems(
                it,
                (s) => s.select,
                (s) => this.subStr(s.content)
            )
        )
    }

    printChats = async () => {
        await this.sortedChats().then((it) =>
            this.listItems(
                it,
                (s) => s.select,
                (s) => s.name
            )
        )
    }

    private listItems = <T,>(
        ts: T[],
        s: (s: T) => boolean,
        n: (n: T) => string
    ) => {
        ts.forEach((it, idx) => {
            println(
                `[${idx === 0 ? color.green('*') : color.pink(idx)}] ${
                    s(it) ? color.yellow(n(it)) : this.text(n(it))
                }`
            )
        })
    }

    printChatConfig = (chatName?: string) => {
        const mcps = (chatId: string) => {
            const { mcpServers } = this.configExt(chatId)
            if (isEmpty(mcpServers)) {
                return ''
            }
            const enableFilter = (s: MCPServerKey) => {
                const one = this.mcps.find(
                    (it) => it.name === s.name && it.version === s.version
                )
                return one !== void 0
            }
            return mcpServers
                .filter(enableFilter)
                .map((it) => `${it.name}/${it.version}`)
                .join('\n')
        }

        const f = (cf: ChatConfig) => {
            const [_, config] = tableConfigWithExt({
                cols: [1, 1, 1, 1],
                alignment: 'left',
            })
            const booleanPrettyFormat = (v: boolean) => (v ? 'true' : 'false')
            const data = [
                [
                    display.caution('Context:'),
                    display.important(booleanPrettyFormat(cf.withContext)),
                    display.caution('ContextSize:'),
                    display.warning(cf.contextLimit),
                ],
                [
                    display.caution('Scenario:'),
                    display.tip(cf.scenarioName),
                    display.caution('MCP:'),
                    display.important(
                        cf.withMCP
                            ? display.tip(mcps(cf.chatId))
                            : booleanPrettyFormat(cf.withMCP)
                    ),
                ],
                [
                    display.caution('LLMType:'),
                    display.tip(cf.llmType),
                    display.caution('Model:'),
                    display.tip(cf.model),
                ],
            ]
            printTable(data, config)
        }
        if (!chatName) {
            f(this.store.currentChatConfig())
            return
        }
        const { id } = this.getChat(chatName)
        f(this.store.queryChatConfig(id))
    }

    printChatHistory = async (limit: number, chatName?: string) => {
        const getMsgs = () => {
            if (!chatName) {
                return this.store.historyMessage(limit)
            }
            const chat = this.getChat(chatName)
            return this.store.chatHistoryMessage(chat, limit)
        }
        const messages = getMsgs()
        if (isEmpty(messages)) {
            throw Error(promptMessage.hisMsgMissing)
        }
        const msp = groupBy(messages, (m: ChatMessage) => m.pairKey)
        const choices = this.historyChoice(msp)
        const loopShow = async (df?: string) => {
            const v = await this.historyShow({
                choices,
                msp,
                df,
            })
            await loopShow(v)
        }
        await loopShow()
    }

    private historyShow = async ({
        choices,
        msp,
        df,
    }: {
        choices: Choice<string>[]
        msp: Map<string, ChatMessage[]>
        df?: string
    }) => {
        const value = await select({
            message: 'View Message:',
            choices,
            default: df,
        })
        const msgs = msp.get(value)
        if (!msgs) {
            throw Error(promptMessage.assistantMissing)
        }
        const expInfo: { role: string; content: string }[] = [
            {
                role: 'user',
                content: this.findRoleMessage('user')(msgs) ?? '',
            },
        ]
        const colExpInfo = (role: string, content: string) =>
            expInfo.push({ role, content })
        const { reasoning, toolsCall, assistant } = this.partMessageByRole(msgs)
        const display = new Display({
            theme: this.generalSetting.theme,
            enableSpinner: false,
        })
        this.historyReasoningPrint(reasoning, display, colExpInfo)
        this.historyToolsCallPrint(toolsCall, display, colExpInfo)
        this.historyAssistantPrint(assistant, display, colExpInfo)
        return value
    }

    private historyAssistantPrint = (
        assistant: string,
        display: Display,
        f: (role: string, content: string) => void
    ) => {
        display.contentShow(assistant)
        display.contentStop()
        f('assistant', assistant)
    }

    private historyReasoningPrint = (
        reasoning: string,
        display: Display,
        f: (role: string, content: string) => void
    ) => {
        if (!reasoning) {
            return
        }
        display.think(reasoning)
        display.stopThink()
        f('reasoning', reasoning)
    }

    private historyToolsCallPrint = (
        toolsCall: string,
        display: Display,
        f: (role: string, content: string) => void
    ) => {
        if (!toolsCall) {
            return
        }
        const res = this.parseToolsCall(toolsCall)
        if (typeof res === 'string') {
            display.think(res)
            display.stopThink()
            f('toolsCall', toolsCall)
            return
        }
        res.forEach((it) => {
            const { mcpServer, mcpVersion, toolName, args, response } = it
            display.toolCall(mcpServer, mcpVersion, toolName, args)
            display.toolCallReult(response)
        })
    }

    private historyChoice = (msp: Map<string, ChatMessage[]>) => {
        return msp.entries().reduce((arr, it) => {
            const userContent = this.findRoleMessage('user')(it[1])
            if (!userContent) {
                return arr
            }
            arr.push({ name: this.subStr(userContent), value: it[0] })
            return arr
        }, [] as Choice<string>[])
    }

    private partMessageByRole = (
        msgs: ChatMessage[] | undefined
    ): {
        assistant: string
        reasoning: string
        toolsCall: string
    } => {
        if (!msgs) {
            return {
                assistant: '',
                reasoning: '',
                toolsCall: '',
            }
        }
        return {
            assistant: this.findRoleMessage('assistant')(msgs) ?? '',
            reasoning: this.findRoleMessage('reasoning')(msgs) ?? '',
            toolsCall: this.findRoleMessage('toolscall')(msgs) ?? '',
        }
    }

    private findRoleMessage = (role: string) => (arr: ChatMessage[]) => {
        return arr.find((it) => it.role === role)?.content
    }

    private parseToolsCall = (toolsCall: string) => {
        try {
            const itemStr: string[] = JSON.parse(toolsCall)
            return itemStr.map((it) => {
                const i: {
                    mcpServer: string
                    mcpVersion: string
                    toolName: string
                    args: string
                    response: string
                } = JSON.parse(it)
                return i
            })
        } catch (err: unknown) {
            return toolsCall
        }
    }

    modifyContextSize = (size: number, chatName?: string) => {
        if (!chatName) {
            this.store.modifyContextLimit(size)
            return
        }
        this.store.modifyChatContextLimit(this.getChat(chatName), size)
    }

    modifyModel = async (chatName?: string) => {
        await this.modifyLLMAndModel(chatName)
    }

    private modifyLLMAndModel = async (chatName?: string) => {
        const [llm, model] = await this.selectLLmAndModel()
        if (!chatName) {
            this.store.modifyModel(llm, model)
            return
        }
        this.store.modifyChatModel(this.getChat(chatName), llm, model)
    }

    modifySystemPrompt = (prompt: string, chatName?: string) => {
        if (!chatName) {
            this.store.modifySystemPrompt(prompt)
            return
        }
        this.store.modifyChatSystemPrompt(this.getChat(chatName), prompt)
    }

    modifyWithContext = (chatName?: string) => {
        if (!chatName) {
            this.store.modifyWithContext()
            return
        }
        this.store.modifyChatWithContext(this.getChat(chatName))
    }

    modifyWithMCP = async (chatName?: string) => {
        // select mcp
        const f = () => {
            if (!chatName) {
                return {
                    chat: this.store.existCurrentChat(),
                    mcp: (v: boolean) => this.store.modifyWithMCP(v),
                }
            }
            const chat = this.getChat(chatName)
            return {
                chat,
                mcp: (v: boolean) => this.store.modifyChatWithMCP(chat, v),
            }
        }
        const { chat, mcp } = f()
        const { id } = chat
        const ext = this.configExt(id)
        const key = (n: string, v: string) => `${n}/${v}`
        const isChecked = (m: MCPClient) => {
            const { mcpServers } = ext
            if (isEmpty(mcpServers)) {
                return false
            }
            const item = mcpServers.find(
                (it) => key(m.name, m.version) === key(it.name, it.version)
            )
            return item !== void 0
        }
        const choices = this.mcps.map((it) => {
            const { name, version } = it
            return {
                name: key(name, version),
                value: { name, version } as MCPServerKey,
                checked: isChecked(it),
            }
        })
        if (isEmpty(choices)) {
            throw Error(promptMessage.mcpMissing)
        }
        const items = await checkbox({ message: 'Select MCP Server:', choices })
        if (isEmpty(items)) {
            ext.mcpServers = []
            mcp(false)
        } else {
            ext.mcpServers = items
            mcp(true)
        }
        this.store.updateChatConfigExt(id, JSON.stringify(ext))
    }

    private configExt = (chatId: string) => {
        const ext = this.store.queryChatConfigExt(chatId)
        if (ext) {
            return JSON.parse(ext.ext) as ConfigExt
        }
        const def = { mcpServers: [] } as ConfigExt
        this.store.saveChatCofnigExt(chatId, JSON.stringify(def))
        return def
    }

    modifyScenario = async (chatName?: string) => {
        await selectRun(
            'Select Scenario:',
            Object.keys(temperature).map((k) => ({
                name: temperature[k][0],
                value: k,
            })),
            (answer) => {
                if (!chatName) {
                    this.store.modifyScenario(temperature[answer])
                    return
                }
                this.store.modifyChatScenario(
                    this.getChat(chatName),
                    temperature[answer]
                )
            }
        )
    }

    publishPrompt = async (chatName?: string) => {
        const getPrompt = () => {
            if (!chatName) {
                return this.store.currentChatConfig().sysPrompt
            }
            const { id } = this.getChat(chatName)
            return this.store.queryChatConfig(id).sysPrompt
        }
        const prompt = getPrompt()
        if (!prompt) {
            throw Error(promptMessage.systemPromptMissing)
        }
        await this.getPublishPromptInput(prompt)
    }

    selectPrompt = async (name: string, chatName?: string) => {
        const prompts = this.store.searchPrompt(name)
        if (isEmpty(prompts)) {
            throw Error(promptMessage.systemPromptNoMatching)
        }
        const choices: Choice<ChatPrompt>[] = prompts.map((it) => ({
            name: it.name,
            value: it,
            description: this.promptChoiceDesc(it),
        }))
        const v = await select({
            message: 'System Prompt:',
            choices,
            theme: themeStyle(color),
        })
        this.modifySystemPrompt(v.content, chatName)
    }

    listPrompt = async (name?: string) => {
        let prompts
        if (name) {
            prompts = this.store.searchPrompt(name)
        } else {
            prompts = this.store.listPrompt()
        }
        if (isEmpty(prompts)) {
            throw Error(promptMessage.systemPromptNoMatching)
        }
        const choices: Choice<ChatPrompt>[] = prompts.map((it) => ({
            name: it.name,
            value: it,
            description: this.promptChoiceDesc(it),
        }))
        const ptShow = async (df?: string) => {
            const value = await select({
                message: 'System Prompt:',
                choices,
                default: df,
                theme: themeStyle(color),
            })
            if (!value) {
                throw Error(promptMessage.systemPromptNoMatching)
            }
            const { content, name } = value
            this.showPrompt(content)
            await ptShow(name)
        }
        await ptShow()
    }

    private promptChoiceDesc = (pt: ChatPrompt) => {
        return `${pt.name}@${pt.version}`
    }

    private showPrompt = (pt: string) => {
        const { palette, assistant } = themes[this.generalSetting.theme]
        const colorSchema = catppuccinColorSchema[palette]
        const c = (color: CatppuccinColorName) => hex(colorSchema[color])
        const textShow = new TextShow({
            title: 'Promot',
            titleColor: c(assistant.titleColor),
            bolderColor: c(assistant.bolderColor),
            textColor: c(assistant.textColor),
            render: true,
        })
        textShow.start()
        textShow.append(pt)
        textShow.stop()
    }

    tools = async () => {
        if (isEmpty(this.mcps)) {
            throw Error(promptMessage.mcpMissing)
        }
        const tools = await Promise.all(
            this.mcps.map(async (it) => {
                let health = display.tip(`[✓]`)
                try {
                    await it.connect()
                } catch (e: unknown) {
                    health = display.warning(`[✗]`)
                } finally {
                    await it.close()
                }
                return [display.tip(it.name), display.tip(it.version), health]
            })
        )
        printTable(
            [
                ['Name', 'Version', 'Health'].map((it) => display.caution(it)),
                ...tools,
            ],
            tableConfig({ cols: [1, 1, 1] })
        )
    }

    testTool = async () => {
        const f = (m: MCPClient) => `${m.name}/${m.version}`
        const choices = this.mcps.map((it) => ({ name: f(it), value: f(it) }))
        if (isEmpty(choices)) {
            throw Error(promptMessage.mcpMissing)
        }
        await selectRun('Select Server', choices, async (v) => {
            const m = this.mcps.find((it) => v === f(it))!
            try {
                await m.connect()
                const res = await m.listTools()
                const tools = res.tools.map((it) => [
                    display.tip(it.name),
                    it.description,
                ])
                printTable(
                    [
                        ['Name', 'Description'].map((it) =>
                            display.caution(it)
                        ),
                        ...tools,
                    ],
                    tableConfig({ cols: [1, 3], alignment: 'left' })
                )
            } finally {
                await m.close()
            }
        })
    }

    prompt = (chatName?: string) => {
        if (!chatName) {
            return this.store.currentChatConfig().sysPrompt
        }
        return this.store.queryChatConfig(this.getChat(chatName).id).sysPrompt
    }

    printPrompt = (chatName?: string) => {
        const pt = this.prompt(chatName)
        if (!pt) {
            throw Error(promptMessage.systemPromptMissing)
        }
        this.showPrompt(pt)
    }

    exportPrompt = async () => {
        const pts = this.store.listPrompt()
        const fileName = (pt: ChatPrompt) => `${pt.name}_${pt.version}.md`
        await Promise.all(pts.map((it) => Bun.write(fileName(it), it.content)))
    }

    importPrompt = async (file: string) => {
        const fileName = file.substring(0, file.lastIndexOf('.'))
        const idx = fileName.lastIndexOf('_')
        const promptName = fileName.substring(0, idx)
        const version = fileName.substring(idx + 1, fileName.length)
        const content = await Bun.file(file).text()
        this.store.publishPrompt(promptName, version, content)
    }

    clearPresetMessage = (chatName?: string) => {
        if (!chatName) {
            this.store.clearPresetMessage()
            return
        }
        this.store.clearChatPresetMessage(this.getChat(chatName))
    }

    printPresetMessage = (chatName?: string) => {
        const presetMessageText = this.presetMessageText({
            colorful: true,
            chatName,
        })
        if (presetMessageText.isDefault) {
            throw Error(promptMessage.presetMsgMissing)
        }
        println(presetMessageText.content)
    }

    editPresetMessage = async (chatName?: string) => {
        const sourceText = this.presetMessageText({ chatName }).content
        const text = await editor(sourceText)
        if (!text) {
            return
        }
        if (isTextSame(sourceText, text)) {
            throw Error(promptMessage.noEdit)
        }
        const contents = this.parsePresetMessageText(text)
        if (contents.length === 1) {
            const { user, assistant } = contents[0]
            const { userPreset, assistantPreset } = promptMessage
            if (
                user.trim() === userPreset &&
                assistant.trim() === assistantPreset
            ) {
                throw Error(promptMessage.noEdit)
            }
        }
        if (!chatName) {
            this.store.createPresetMessage(contents)
            return
        }
        this.store.createChatPresetMessage(this.getChat(chatName), contents)
    }

    private presetMessageText = ({
        colorful = false,
        chatName,
    }: {
        colorful?: boolean
        chatName?: string
    }): {
        isDefault: boolean
        content: string
    } => {
        const userType = () => `${colorful ? color.mauve.bold('user') : 'user'}`
        const assistantType = () =>
            `${colorful ? color.yellow.bold('assistant') : 'assistant'}`
        const pairMessage = (user: string, assistant: string) =>
            `[${userType()}]\n${user}\n\n[${assistantType()}]\n${assistant}\n`
        const getPresetMessages = () => {
            if (!chatName) {
                return this.store.selectPresetMessage()
            }
            return this.store.selectChatPresetMessage(this.getChat(chatName))
        }
        const presetMessages = getPresetMessages()
        if (isEmpty(presetMessages)) {
            const { userPreset, assistantPreset } = promptMessage
            const dfText = pairMessage(userPreset, assistantPreset)
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
            }) as PresetMessageContent
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

    private sortedChats = async (): Promise<Chat[]> => {
        const cts = this.store.chats()
        if (isEmpty(cts)) {
            throw Error(promptMessage.chatMissing)
        }
        return this.sortedItem(
            cts,
            (s) => s.select,
            (s) => s.actionTime
        )
    }

    private sortedTopics = async (): Promise<ChatTopic[]> => {
        const tps = this.store.currentChatTopics()
        if (isEmpty(tps)) {
            throw Error(promptMessage.topicMissing)
        }
        return this.sortedItem(
            tps,
            (s) => s.select,
            (s) => s.createTime
        )
    }

    private sortedItem = async <T,>(
        arr: T[],
        selected: (s: T) => boolean,
        time: (s: T) => bigint
    ): Promise<T[]> => {
        const [st, oths] = await Promise.all([
            arr.find((it) => selected(it)),
            arr
                .filter((it) => !selected(it))
                .sort((a, b) => Number(time(b) - time(a))),
        ])
        return [st!, ...oths]
    }

    private subStr = (str: string) => {
        const wd = Math.floor(terminal.column * 0.7)
        const s = JSON.stringify(str)
        return this.loopSubStr(s.substring(1, s.length - 1), wd)
    }

    private loopSubStr = (str: string, targetWd: number): string => {
        if (stringWidth(str) <= targetWd) {
            return str
        }
        const maxLoop = 20
        let low = 0
        let high = str.length
        let result = ''
        for (let i = 0; i < maxLoop && low <= high; i++) {
            const mid = Math.floor((low + high) / 2)
            const candidate = str.substring(0, mid) + '...'
            if (stringWidth(candidate) <= targetWd) {
                result = candidate
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        return result
    }

    exportAllChatMessage = async (path?: string) => {
        const msgs = this.store.queryAllExportMessage()
        await this.exportXlsx(msgs, `ifcli_all_chat_message_${unixnow()}`, path)
    }

    exportChatMessage = async (path?: string) => {
        const { id: chatId } = await this.allChatToSelect()
        await this.exportXlsx(
            this.store.queryChatExportMessage(chatId),
            `ifcli_chat_message_${unixnow()}`,
            path
        )
    }

    exportChatTopicMessage = async (path?: string) => {
        const { id: chatId } = await this.allChatToSelect()
        const topics = this.store.queryTopic(chatId)
        const { id: topicId } = await this.topicToSelect(topics)
        await this.exportXlsx(
            this.store.queryChatTopicExportMessage(chatId, topicId),
            `ifcli_chat_topic_message_${unixnow()}`,
            path
        )
    }

    exportTopicMessage = async (path?: string) => {
        const topics = this.store.currentChatTopics()
        const { id, chatId } = await this.topicToSelect(topics)
        await this.exportXlsx(
            this.store.queryChatTopicExportMessage(chatId, id),
            `ifcli_chat_topic_message_${unixnow()}`,
            path
        )
    }

    private topicToSelect = async (topics: ChatTopic[]) => {
        const choices: Choice<ChatTopic>[] = topics.map((it) => ({
            name: this.subStr(it.content),
            value: it,
            description: this.descriptionTrim(it.content),
        }))
        if (isEmpty(choices)) {
            throw Error(promptMessage.topicMissing)
        }
        return await select({
            message: 'Select Topic:',
            choices,
            theme: themeStyle(color),
        })
    }

    private descriptionTrim = (str: string) => {
        const lines = str.split('\n')
        if (lines.length <= 15) {
            return str
        }
        return [...lines.slice(0, 10), '...', ...lines.slice(-5)].join('\n')
    }

    private allChatToSelect = async () => {
        const chats = this.store.chats()
        const choices: Choice<Chat>[] = chats.map((it) => ({
            name: it.name,
            value: it,
        }))
        if (isEmpty(choices)) {
            throw Error(promptMessage.chatMissing)
        }
        return await select({
            message: 'Select Chat:',
            choices,
            theme: themeStyle(color),
        })
    }

    private exportXlsx = async (
        objs: ExportMessage[],
        fileName: string,
        exportPath?: string
    ) => {
        const schema: Schema<ExportMessage> = [
            {
                column: 'ChatName',
                type: String,
                value: (c) => c.chatName,
            },
            {
                column: 'TopicName',
                type: String,
                value: (c) => c.topicName,
            },
            {
                column: 'UserContent',
                type: String,
                value: (c) => c.user,
            },
            {
                column: 'ReasoningContent',
                type: String,
                value: (c) => c.reasoning,
            },
            {
                column: 'AssistantContent',
                type: String,
                value: (c) => c.assistant,
            },
            {
                column: 'ActionTime',
                type: String,
                value: (c) => c.actionTime,
            },
        ]

        await writeXlsxFile(objs, {
            schema,
            filePath: `${exportPath ? exportPath : env('HOME')}${path.sep}${fileName}.xlsx`,
        })
    }

    queryCaches = (keys: string[]) => {
        return this.store.queryCache(keys)
    }

    saveOrUpdateCaches = (caches: Cache[]) => {
        this.store.saveOrUpdateCache(caches)
    }

    deleteCaches = (keys: string[]) => {
        this.store.deleteCache(keys)
    }
}
