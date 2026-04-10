/* eslint-disable @typescript-eslint/no-unused-vars */

import type { LLMOutputHandler, LLMState } from '../../llm/llm-output-handler'
import type { LLMResultChunk } from '../../llm/llm-types'
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
        args: string,
    ): void {
        this.display.toolCall(server, version, name, args)
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

    getResult(): LLMResultChunk {
        return this.display.result()
    }
}
