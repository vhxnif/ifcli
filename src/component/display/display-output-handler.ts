/* eslint-disable @typescript-eslint/no-unused-vars */

import type { LLMOutputHandler, LLMState } from '../../llm/llm-output-handler'
import { SimplifiedDisplay } from '../simplified-display'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
    SpinnerName,
    ThemeSemanticColors,
} from '../theme/theme-type'

export type DisplayOutputHandlerOptions = {
    color: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    semanticColors: ThemeSemanticColors
    enableSpinner?: boolean
    textShowRender?: boolean
    spinnerName?: SpinnerName
}

export class DisplayOutputHandler implements LLMOutputHandler {
    private display: SimplifiedDisplay

    constructor(options: DisplayOutputHandlerOptions) {
        const {
            color,
            theme,
            semanticColors,
            enableSpinner = true,
            textShowRender = true,
            spinnerName,
        } = options
        this.display = new SimplifiedDisplay({
            color,
            theme,
            semanticColors,
            enableSpinner,
            enableRealtimeRender: textShowRender,
            spinnerName,
        })
    }
    stop(): void {
        this.display.stop()
    }

    onContentChunk(content: string): void {
        this.display.contentShow(content)
    }

    onReasoningChunk(reasoning: string): void {
        this.display.think(reasoning)
    }

    onToolCallChunk() {
        this.display.toolPrepare()
    }

    onToolCall(name: string): void {
        this.display.toolCall(name)
    }

    onToolResult(result: string): void {
        this.display.toolCallResult(result)
    }

    onStateChange(state: LLMState): void {
        this.display.change(state)
    }

    onError(_error: Error): void {
        this.display.error()
    }
}
