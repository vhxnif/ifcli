/* eslint-disable @typescript-eslint/no-unused-vars */
import type { LLMResultChunk } from '../llm/llm-types'
import type { LLMOutputHandler, LLMState } from '../llm/llm-output-handler'
import { Display } from './llm-result-show'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
} from './theme/theme-type'

export class DisplayOutputHandler implements LLMOutputHandler {
    private display: Display
    private hasReasoningContent: boolean = false
    private hasReasoningStopped: boolean = false
    private collector: { tools: string[]; assistant: string[]; reasoning: string[] }

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
        this.display = new Display({
            color,
            theme,
            enableSpinner,
            textShowRender,
        })
        this.collector = { tools: [], assistant: [], reasoning: [] }
    }

    onContentChunk(content: string): void {
        this.collector.assistant.push(content)
        this.display.contentShow(content)
    }

    onContentComplete(): void {
        this.display.contentStop()
    }

    onReasoningChunk(reasoning: string): void {
        this.hasReasoningContent = true
        this.collector.reasoning.push(reasoning)
        this.display.think(reasoning)
    }

    onReasoningComplete(): void {
        if (!this.hasReasoningStopped) {
            this.display.stopThink()
            this.hasReasoningStopped = true
        }
    }

    onToolCall(
        server: string,
        version: string,
        name: string,
        args: string
    ): void {
        this.display.toolCall(server, version, name, args)
    }

    onToolResult(result: string): void {
        this.display.toolCallReult(result)
        this.collector.tools.push(result)
    }

    onStateChange(state: LLMState): void {
        this.display.change(state)
    }

    onError(error: Error): void {
        this.display.error()
    }

    getResult(): LLMResultChunk {
        return this.display.result()
    }
}