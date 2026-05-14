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
    onReasoningChunk(reasoning: string): void
    onToolCallChunk(): void
    onToolCall(name: string): void
    onToolResult(result: string): void
    onStateChange(state: LLMState): void
    onError(error: Error): void
    stop(): void
}
