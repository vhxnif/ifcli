import type MCPClient from './mcp-client'

export type LLMRole = 'system' | 'user' | 'assistant'
export type LLMMessage = {
    role: LLMRole
    content: string
}

export type CallParam = {
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
    call: (param: CallParam) => Promise<void>
    stream: (param: CallParam) => Promise<void>
    callWithTools: (param: CallParam) => Promise<void>
}
