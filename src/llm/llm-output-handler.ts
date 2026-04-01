/* eslint-disable @typescript-eslint/no-unused-vars */
import type { LLMResultChunk } from './llm-types'

export type LLMState =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'

export interface LLMOutputHandler {
    onContentChunk(content: string): void
    onContentComplete(): void
    onReasoningChunk(reasoning: string): void
    onReasoningComplete(): void
    onToolCall(
        server: string,
        version: string,
        name: string,
        args: string
    ): void
    onToolResult(result: string): void
    onStateChange(state: LLMState): void
    onError(error: Error): void
    getResult(): LLMResultChunk
}

export class ResultCollector implements LLMOutputHandler {
    private reasoning: string[] = []
    private assistant: string[] = []
    private tools: string[] = []

    onContentChunk(content: string): void {
        this.assistant.push(content)
    }

    onContentComplete(): void {}

    onReasoningChunk(reasoning: string): void {
        this.reasoning.push(reasoning)
    }

    onReasoningComplete(): void {}

    onToolCall(
        _server: string,
        _version: string,
        _name: string,
        _args: string
    ): void {}

    onToolResult(_result: string): void {}

    onStateChange(_state: LLMState): void {}

    onError(_error: Error): void {}

    getResult(): LLMResultChunk {
        return {
            reasoning: this.reasoning,
            assistant: this.assistant,
            tools: this.tools,
        }
    }
}

export class SilentOutputHandler implements LLMOutputHandler {
    private collector: ResultCollector

    constructor() {
        this.collector = new ResultCollector()
    }

    onContentChunk(content: string): void {
        this.collector.onContentChunk(content)
    }

    onContentComplete(): void {}

    onReasoningChunk(reasoning: string): void {
        this.collector.onReasoningChunk(reasoning)
    }

    onReasoningComplete(): void {}

    onToolCall(
        _server: string,
        _version: string,
        _name: string,
        _args: string
    ): void {}

    onToolResult(_result: string): void {}

    onStateChange(_state: LLMState): void {}

    onError(_error: Error): void {}

    getResult(): LLMResultChunk {
        return this.collector.getResult()
    }
}