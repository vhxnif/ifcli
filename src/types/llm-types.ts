import type MCPClient from './mcp-client'

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
    messages: LLMMessage[]
    model: string
    temperature: number
}

export type LLMCallParam = LLMParam & {
    contentConsumer: (str: string) => void
}


export type LLMStreamParam = LLMParam & {
    messageStore: (result: LLMResult) => void
}

export type LLMStreamMCPParam = LLMStreamParam & {
    mcpClients: MCPClient[]
}

export interface ILLMClient {
    tools: () => MCPClient[]
    defaultModel: () => string
    models: () => string[]
    user: (content: string) => LLMMessage
    system: (content: string) => LLMMessage
    assistant: (content: string) => LLMMessage
    call: (param: LLMCallParam) => Promise<void>
    stream: (param: LLMStreamParam) => Promise<void>
    callWithTools: (param: LLMStreamMCPParam) => Promise<void>
}
