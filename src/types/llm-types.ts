import type OpenAI from 'openai'
import type { RunnableToolFunctionWithoutParse } from 'openai/lib/RunnableFunction.mjs'
import type MCPClient from './mcp-client'

export type LLMRole = 'system' | 'user' | 'assistant'
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
    theme?: string
    noStream?: boolean
    newTopic?: boolean
}

export type LLMResultChunk = {
    reasoning: string[]
    assistant: string[]
    tools: string[]
}

export type LLMStreamCallParam = LLMParam

export type LLMToolsCallParam = LLMParam & {
    tools: {
        id: string
        mcpServer: string
        mcpVersion: string
        funName: string
        f: RunnableToolFunctionWithoutParse
    }[]
    mcps: MCPClient[]
}

export interface ILLMClient {
    openai: OpenAI
    type: string
    models: string[]
    defaultModel: string
}
