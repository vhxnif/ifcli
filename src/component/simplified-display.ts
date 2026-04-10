import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import chalk from 'chalk'
import type { Color } from 'ora'
import type { LLMResultChunk } from '../llm/llm-types'
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

    private reasoningContent: string[] = []
    private assistantContent: string[] = []
    private toolsContent: string[] = []

    private pendingToolName: string | null = null
    private currentRole: 'idle' | 'reasoning' | 'assistant' | 'tools' = 'idle'
    private needsNewline: boolean = false

    private hasReasoningStopped: boolean = false

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

    private ensureNewline(): void {
        if (this.needsNewline && this.enableRealtimeRender) {
            this.output.println('')
            this.needsNewline = false
        }
    }

    think(reasoning: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }

        if (this.currentRole !== 'reasoning') {
            if (this.currentRole !== 'idle' && this.enableRealtimeRender) {
                this.output.println('')
            }
            this.currentRole = 'reasoning'
        }

        this.reasoningContent.push(reasoning)
        if (this.enableRealtimeRender) {
            this.output.print(this.theme.reasoner.content(reasoning))
            this.needsNewline = true
        }
    }

    stopThink(): void {
        if (this.reasoningContent.length > 0 && !this.hasReasoningStopped) {
            this.hasReasoningStopped = true
            if (this.enableRealtimeRender) {
                this.output.println('')
                this.output.println('')
                this.needsNewline = false
            }
            this.currentRole = 'idle'
        }
        if (this.enableRealtimeRender) {
            this.spinner?.start()
        }
    }

    contentShow(content: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }

        if (this.currentRole !== 'assistant') {
            if (this.currentRole !== 'idle' && this.enableRealtimeRender) {
                this.output.println('')
            }
            this.currentRole = 'assistant'
        }

        this.assistantContent.push(content)
        if (this.enableRealtimeRender) {
            this.output.print(this.theme.assisant.content(content))
            this.needsNewline = true
        }
    }

    contentStop(): void {
        if (this.enableRealtimeRender) {
            this.output.println('')
            this.output.println('')
            this.needsNewline = false
        }
        this.currentRole = 'idle'
    }

    toolCall(
        _mcpServer: string,
        _mcpVersion: string,
        funName: string,
        _args: string,
    ): void {
        this.pendingToolName = funName
        this.ensureNewline()
        this.spinner?.stop()
    }

    toolCallResult(result: string): void {
        this.toolsContent.push(result)

        if (this.currentRole !== 'tools') {
            if (this.currentRole !== 'idle' && this.enableRealtimeRender) {
                this.output.println('')
                this.needsNewline = false
            }
            this.currentRole = 'tools'
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
                this.needsNewline = false
            }

            this.pendingToolName = null
        }

        if (this.enableRealtimeRender) {
            this.ensureNewline()
            const renderColor = getSemanticColor(
                this.semanticColors,
                'rendering',
            )
            this.spinner?.setColor(renderColor)
            this.spinner?.start(this.notice('rendering'))
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
        this.ensureNewline()
        this.spinner?.start()
        this.spinner?.show(this.notice(type))
        this.spinner?.setColor(getSemanticColor(this.semanticColors, type))
    }

    error(): void {
        this.spinner?.fail(this.notice('error'))
    }

    result(): LLMResultChunk {
        return {
            tools: this.toolsContent,
            assistant: this.assistantContent,
            reasoning: this.reasoningContent,
        }
    }
}
