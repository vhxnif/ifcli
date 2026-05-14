import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import chalk from 'chalk'
import type { Color } from 'ora'
import {
    getSemanticColor,
    type LLMNotifyMessageType,
    llmNotifyMessage,
} from '../llm/llm-utils'
import { print, println } from '../util/common-utils'
import { OraShow } from './ora-show'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
    SpinnerName,
    ThemeSemanticColors,
} from './theme/theme-type'

export type OutputFn = {
    print: (str: string) => void
    println: (str: string) => void
}

const defaultOutput: OutputFn = { print, println }

export class SimplifiedDisplay {
    private theme: ChalkChatBoxTheme
    private color: ChalkTerminalColor
    private semanticColors: ThemeSemanticColors
    private spinner?: OraShow
    private enableRealtimeRender: boolean
    private output: OutputFn
    private pendingToolName: string | null = null
    private currentRole: 'idle' | 'reasoning' | 'assistant' | 'tools' = 'idle'

    constructor({
        color,
        theme,
        semanticColors,
        enableSpinner = true,
        enableRealtimeRender = true,
        spinnerName = 'helix',
        output = defaultOutput,
    }: {
        color: ChalkTerminalColor
        theme: ChalkChatBoxTheme
        semanticColors: ThemeSemanticColors
        enableSpinner?: boolean
        enableRealtimeRender?: boolean
        spinnerName?: SpinnerName
        output?: OutputFn
    }) {
        this.theme = theme
        this.color = color
        this.semanticColors = semanticColors
        this.enableRealtimeRender = enableRealtimeRender
        this.output = output
        if (enableSpinner) {
            const spinnerColor = getSemanticColor(
                this.semanticColors,
                'waiting',
            )
            this.spinner = new OraShow(
                this.notice('waiting'),
                spinnerName,
                spinnerColor as Color,
            )
            this.spinner.start()
        }
    }

    private notice(type: LLMNotifyMessageType) {
        const colorName = getSemanticColor(this.semanticColors, type)
        return chalk[colorName](llmNotifyMessage[type])
    }

    private newLine() {
        if (this.enableRealtimeRender) {
            this.output.println('')
        }
    }

    think(reasoning: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }
        if (this.currentRole !== 'reasoning') {
            this.currentRole = 'reasoning'
        }
        if (this.enableRealtimeRender) {
            this.output.print(this.theme.reasoner.content(reasoning))
        }
    }

    idle() {
        if (this.enableRealtimeRender) {
            this.newLine()

            this.spinner?.start(this.color.green('reasoning...'))
        }
    }

    contentShow(content: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }
        if (this.currentRole !== 'assistant') {
            this.currentRole = 'assistant'
            this.newLine()
            this.newLine()
        }
        if (this.enableRealtimeRender) {
            this.output.print(this.theme.assisant.content(content))
        }
    }

    toolPrepare(): void {
        if (this.enableRealtimeRender) {
            this.spinner?.start(this.color.magenta('prepare...'))
        }
    }

    toolCall(funName: string): void {
        if (this.currentRole !== 'tools') {
            this.currentRole = 'tools'
        }
        this.pendingToolName = funName
        if (this.enableRealtimeRender) {
            const name = this.theme.tools.title(`[${this.pendingToolName}]`)
            this.spinner?.show(name)
        }
    }

    toolCallResult(result: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }
        const res = this.parseToolResult(result)
        const isSuccess = res ? !res.isError : false
        if (this.pendingToolName) {
            if (this.enableRealtimeRender) {
                this.spinner?.stop()
                const textColor = this.theme.tools.title
                const toolResultColor = this.theme.tools.content
                const statusColor = isSuccess
                    ? this.color.green
                    : this.color.red
                const statusSymbol = isSuccess ? '✓' : '✗'

                this.output.println(
                    textColor(`[${this.pendingToolName}] `) +
                        statusColor(statusSymbol) +
                        toolResultColor(
                            this.subResultContent(res as CallToolResult),
                        ),
                )
            }
            this.pendingToolName = null
            this.idle()
        }
    }

    private subResultContent(result: CallToolResult): string {
        const text = result?.content?.find((it) => it?.type === 'text')?.text
        if (!text) {
            return ''
        }
        const l = text.length
        if (l <= 100) {
            return `\n${text}`
        }
        return `\n${text.slice(0, 50)}....${text.slice(l - 50, l)}`
    }

    private parseToolResult(content: string): CallToolResult | null {
        try {
            return JSON.parse(content)
        } catch {
            return null
        }
    }

    change(type: LLMNotifyMessageType): void {
        this.spinner?.start()
        this.spinner?.show(this.notice(type))
        this.spinner?.setColor(getSemanticColor(this.semanticColors, type))
    }

    error(): void {
        this.spinner?.fail(this.notice('error'))
    }

    stop(): void {
        this.spinner?.stop()
    }
}
