/* eslint-disable @typescript-eslint/no-unused-vars */
import type OpenAI from 'openai'
import type { LLMResultChunk } from '../llm/llm-types'
import { jsonformat } from '../util/common-utils'
import {
    llmNotifyMessage,
    llmNotifyMessageColor,
    type LLMNotifyMessageType,
} from '../llm/llm-utils'
import { OraShow } from './ora-show'
import { TextShow } from './text-show'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type {
    ChalkChatBoxColor,
    ChalkChatBoxTheme,
    ChalkTerminalColor,
} from './theme/theme-type'

export class Display {
    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private hasReasoningStoped: boolean = false
    private reasoningShow: TextShow
    private assistantShow: TextShow
    private toolsCallShow: TextShow
    private theme: ChalkChatBoxTheme
    private color: ChalkTerminalColor
    private spinner?: OraShow

    constructor({
        color,
        theme,
        enableSpinner = true,
        textShowRender = true,
    }: {
        color: ChalkTerminalColor
        theme: ChalkChatBoxTheme
        enableSpinner?: boolean
        textShowRender?: boolean
    }) {
        this.theme = theme
        this.color = color
        const { reasoner, tools, assisant } = this.theme
        this.reasoningShow = new TextShow({
            title: 'Reasoning',
            ...this.toTextShowTheme(reasoner),
            render: textShowRender,
        })
        this.assistantShow = new TextShow({
            title: 'Assistant',
            ...this.toTextShowTheme(assisant),
            render: textShowRender,
        })
        this.toolsCallShow = new TextShow({
            structured: true,
            title: 'ToolsCall',
            ...this.toTextShowTheme(tools),
            render: textShowRender,
        })
        if (enableSpinner) {
            this.spinner = new OraShow(this.notice('waiting'))
            this.spinner.start()
        }
    }

    private notice(type: LLMNotifyMessageType) {
        return this.color[llmNotifyMessageColor[type]](llmNotifyMessage[type])
    }

    private toTextShowTheme(themeColor: ChalkChatBoxColor) {
        const { title, bolder, content } = themeColor
        return {
            titleColor: title.bold,
            bolderColor: bolder,
            textColor: content,
        }
    }

    result(): LLMResultChunk {
        return {
            tools: this.toolsCallShow.getContent(),
            assistant: this.assistantShow.getContent(),
            reasoning: this.reasoningShow.getContent(),
        }
    }

    thinkingShow(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): void {
        const delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
            reasoning_content?: string
            reasoning?: string
        } = chunk.choices[0]?.delta
        const reasoning = delta.reasoning || delta.reasoning_content || ''
        const content = delta.content || ''
        if (reasoning) {
            this.hasReasoningContent = true
            // think start
            this.think(reasoning)
        }
        const combinedChunks = this.lastChunk + content
        this.lastChunk = content
        // 检测思考结束
        if (combinedChunks.includes('###Response') || content === '</think>') {
            // think stop
            this.stopThink()
        }
        // 如果之前有reasoning_content，现在有普通content，说明思考结束
        if (this.hasReasoningContent && content) {
            // think stop
            this.stopThink()
        }
        if (content) {
            this.contentShow(content)
        }
    }

    contentShow(content: string): void {
        this.spinner?.stop()
        this.assistantShow.append(content)
    }

    contentStop(): Display {
        this.assistantShow.stop()
        return this
    }

    toolCall(
        mcpServer: string,
        mcpVersion: string,
        funName: string,
        args: string
    ): void {
        this.spinner?.stop()
        const argsStr = jsonformat(args)
        this.toolsCallShow.start()
        this.toolTitle(`McpServer: `)
        this.toolProperty(mcpServer, 'mcpServer')
        this.toolText(`  `)
        this.toolTitle(`McpVersion: `)
        this.toolProperty(mcpVersion, 'mcpVersion')
        this.toolText(`  `)
        this.toolTitle(`ToolName: `)
        this.toolProperty(funName, 'toolName')
        this.toolText(`\n\n`)
        this.toolTitle(`Arguments: `)
        this.toolText(`\n\n`)
        this.toolProperty(argsStr, 'args', true)
        this.toolText(`\n\n`)
    }

    toolCallReult(content: string): void {
        const ct = this.responseParse(content)
        this.toolTitle(`Response: `)
        this.toolText(`\n\n`)
        this.toolProperty(ct, 'response', true)
        this.toolsCallShow.stop()
        this.spinner?.start(this.notice('rendering'))
    }

    private toolTitle(str: string) {
        this.toolsCallShow.append(str, {
            textColor: this.theme.assisant.title.bold,
        })
    }

    private toolProperty(str: string, key: string, withoutColor?: boolean) {
        this.toolsCallShow.append(str, {
            key,
            textColor: withoutColor ? undefined : this.theme.assisant.content,
        })
    }

    private toolText(str: string) {
        this.toolsCallShow.append(str)
    }

    change(type: LLMNotifyMessageType): void {
        this.spinner?.show(this.notice(type))
    }

    error(): void {
        this.spinner?.fail(this.notice('error'))
    }

    think(reasoning: string): void {
        this.spinner?.stop()
        this.reasoningShow.append(reasoning)
    }

    stopThink(): void {
        if (!this.hasReasoningStoped) {
            this.reasoningShow.stop()
            this.spinner?.start()
            this.hasReasoningStoped = true
        }
    }

    private responseParse(content: string) {
        try {
            const res: CallToolResult = JSON.parse(content)
            const ct = res.content
            if (!ct) {
                return jsonformat(content)
            }
            const textArr = ct
                .filter((it) => it.type === 'text')
                .reduce((arr, it) => {
                    arr.push(JSON.parse(it.text))
                    return arr
                }, [] as string[])
            return JSON.stringify(textArr, null, 4)
        } catch (err: unknown) {
            return jsonformat(content)
        }
    }
}
