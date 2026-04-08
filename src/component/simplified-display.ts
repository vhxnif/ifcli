/* eslint-disable @typescript-eslint/no-unused-vars */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
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

export class SimplifiedDisplay {
    private theme: ChalkChatBoxTheme
    private color: ChalkTerminalColor
    private semanticColors: ThemeSemanticColors
    private spinner?: OraShow
    private enableRealtimeRender: boolean

    private reasoningContent: string[] = []
    private assistantContent: string[] = []
    private toolsContent: string[] = []

    private pendingToolName: string | null = null
    private currentRole: 'idle' | 'reasoning' | 'assistant' | 'tools' = 'idle'

    private hasReasoningStopped: boolean = false

    constructor({
        color,
        theme,
        semanticColors,
        enableSpinner = true,
        enableRealtimeRender = true,
        spinnerName = 'helix',
    }: {
        color: ChalkTerminalColor
        theme: ChalkChatBoxTheme
        semanticColors: ThemeSemanticColors
        enableSpinner?: boolean
        enableRealtimeRender?: boolean
        spinnerName?: SpinnerName
    }) {
        this.theme = theme
        this.color = color
        this.semanticColors = semanticColors
        this.enableRealtimeRender = enableRealtimeRender
        if (enableSpinner) {
            const spinnerColor = getSemanticColor(
                this.semanticColors,
                'waiting',
            )
            this.spinner = new OraShow(
                this.notice('waiting'),
                spinnerName,
                spinnerColor,
            )
            this.spinner.start()
        }
    }

    private notice(type: LLMNotifyMessageType) {
        const colorName = getSemanticColor(this.semanticColors, type)
        return this.color[colorName](llmNotifyMessage[type])
    }

    think(reasoning: string): void {
        if (this.enableRealtimeRender) {
            this.spinner?.stop()
        }

        if (this.currentRole !== 'reasoning') {
            if (this.currentRole !== 'idle' && this.enableRealtimeRender) {
                println('')
            }
            this.currentRole = 'reasoning'
        }

        this.reasoningContent.push(reasoning)
        if (this.enableRealtimeRender) {
            print(this.theme.reasoner.content(reasoning))
        }
    }

    stopThink(): void {
        // 如果有推理内容，输出空行分隔
        if (this.reasoningContent.length > 0 && !this.hasReasoningStopped) {
            this.hasReasoningStopped = true
            if (this.enableRealtimeRender) {
                println('')
                println('')
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
                println('')
            }
            this.currentRole = 'assistant'
        }

        this.assistantContent.push(content)
        if (this.enableRealtimeRender) {
            print(this.theme.assisant.content(content))
        }
    }

    contentStop(): void {
        if (this.enableRealtimeRender) {
            println('')
            println('')
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
        if (this.enableRealtimeRender) {
            const toolCallingColor = getSemanticColor(
                this.semanticColors,
                'toolCalling',
            )
            const message = this.color[toolCallingColor](
                `${llmNotifyMessage.toolCalling} [${funName}]`,
            )
            this.spinner?.show(message)
            this.spinner?.setColor(toolCallingColor)
        }
    }

    toolCallResult(result: string): void {
        this.toolsContent.push(result)

        if (this.currentRole !== 'tools') {
            if (this.currentRole !== 'idle' && this.enableRealtimeRender) {
                println('')
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

                println(
                    textColor(`[${this.pendingToolName}] `) +
                        statusColor(statusSymbol) +
                        toolResultColor(
                            this.subResultContent(res as CallToolResult),
                        ),
                )
            }

            this.pendingToolName = null
        }

        if (this.enableRealtimeRender) {
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
