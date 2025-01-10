import type MCPClient from './mcp-client'

export type LLMRole = 'system' | 'user' | 'assistant'
export type LLMMessage = {
    role: LLMRole
    content: string
}

export type LLMCallParam = {
    messages: LLMMessage[]
    model: string
    temperature: number
    f: (res: string) => void
    mcpClients?: MCPClient[]
}

export interface ILLMClient {
    tools: () => MCPClient[]
    defaultModel: () => string
    models: () => string[]
    user: (content: string) => LLMMessage
    system: (content: string) => LLMMessage
    assistant: (content: string) => LLMMessage
    call: (param: LLMCallParam) => Promise<void>
    stream: (param: LLMCallParam) => Promise<void>
    callWithTools: (param: LLMCallParam) => Promise<void>
}
