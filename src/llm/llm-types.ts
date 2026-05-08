import type OpenAI from 'openai'
import type { LLMOutputHandler } from './llm-output-handler'
import type MCPClient from './mcp-client'
import type { ToolDef } from './mcp-client'

export type LLMRole = 'system' | 'user' | 'assistant' | 'tool'
export type LLMMessage = {
    role: LLMRole
    content: string
}

export type LLMResult = {
    userContent: string
    assistantContent: string
    thinkingReasoning?: string
}

export type LLMParam = {
    userContent: string
    messages: LLMMessage[]
    model: string
    temperature: number
    noStream: boolean
    theme?: string
    newTopic?: boolean
    outputHandler?: LLMOutputHandler
    topicNamePromise?: Promise<string>
}

export type LLMResultChunk = {
    reasoning: string[]
    assistant: string[]
    tools: string[]
}

export type LLMStreamCallParam = LLMParam

export type LLMToolsCallParam = LLMParam & {
    tools: ToolDef[]
    mcps: MCPClient[]
}

export interface ILLMClient {
    openai: OpenAI
    type: string
    models: string[]
    defaultModel: string
    topicModel: string
}
