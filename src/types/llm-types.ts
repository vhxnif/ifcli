import type MCPClient from "./mcp-client"

export type LLMRole = "system" | "user" | "assistant"
export type LLMMessage = {
  role: LLMRole
  content: string
}

export interface ILLMClient {
  tools: () => MCPClient[]
  coderModel: () => string
  chatModel: () => string
  models: () => string[]
  user: (content: string) => LLMMessage
  system: (content: string) => LLMMessage
  assistant: (content: string) => LLMMessage
  call: (
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => Promise<void>
  stream: (
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => Promise<void>
  callWithTools: (
    mcpClients: MCPClient[],
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => Promise<void>
}
