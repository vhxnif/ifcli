import type { RunnableToolFunctionWithoutParse } from 'openai/lib/RunnableFunction.mjs'
import type MCPClient from './mcp-client'
import type OpenAI from 'openai'

export type LLMRole = 'system' | 'user' | 'assistant'
export type LLMMessage = {
    role: LLMRole
    content: string
}

export type LLMResult = {
    userContent: string,
    assistantContent: string,
    thinkingReasoning? :string
}

export type LLMParam = {
    userContent: string,
    messages: LLMMessage[]
    model: string
    temperature: number
}

export type LLMResultChunk = {
    reasoning: string[],
    assistant: string[],
    tools: string[],
}

export type LLMStreamCallParam = LLMParam

export type LLMToolsCallParam = LLMParam & {
    tools: { id: string, name: string, f: RunnableToolFunctionWithoutParse}[]
    mcps: MCPClient[]
}

export interface ILLMClient {
    openai: OpenAI
    type: string 
    models: string[]
    defaultModel: string 
}
