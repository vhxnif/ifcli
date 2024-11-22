export type LLMRole = 'system' | 'user' | 'assistant'
export type LLMMessage = {
    role: LLMRole,
    content: string 
}
export interface ILLMClient {
    coderModel: () => string
    chatModel: () => string
    models: () => string[]
    user: (content: string) => LLMMessage
    system: (content: string) => LLMMessage
    assistant: (content: string) => LLMMessage
    call: (messages: LLMMessage[], model: string, f: (res: string) => void ) => Promise<void> 
    stream: (messages: LLMMessage[], model: string, f: (res: string) => void ) => Promise<void>
}
