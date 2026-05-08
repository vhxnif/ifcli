/* eslint-disable @typescript-eslint/no-unused-vars */

export type LLMState =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'
    | 'toolCalling'

export interface LLMOutputHandler {
    onContentChunk(content: string): void
    onContentComplete(): void
    onReasoningChunk(reasoning: string): void
    onReasoningComplete(): void
    onToolCall(name: string): void
    onToolResult(result: string): void
    onStateChange(state: LLMState): void
    onError(error: Error): void
}
