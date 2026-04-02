/* eslint-disable @typescript-eslint/no-unused-vars */
import type { LLMResultChunk } from '../../llm/llm-types'
import type { LLMOutputHandler, LLMState } from '../../llm/llm-output-handler'
import { SimplifiedDisplay } from '../simplified-display'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
} from '../theme/theme-type'

export type DisplayOutputHandlerOptions = {
    color: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    enableSpinner?: boolean
    textShowRender?: boolean
}

export class DisplayOutputHandler implements LLMOutputHandler {
    private display: SimplifiedDisplay

    constructor(options: DisplayOutputHandlerOptions) {
        const { color, theme, enableSpinner = true } = options
        this.display = new SimplifiedDisplay({
            color,
            theme,
            enableSpinner,
        })
    }

    onContentChunk(content: string): void {
        this.display.contentShow(content)
    }

    onContentComplete(): void {
        this.display.contentStop()
    }

    onReasoningChunk(reasoning: string): void {
        this.display.think(reasoning)
    }

    onReasoningComplete(): void {
        this.display.stopThink()
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
        this.display.toolCallResult(result)
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