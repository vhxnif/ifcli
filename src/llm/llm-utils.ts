import type { LLMMessage, LLMRole } from './llm-types'
import type { TerminalColorName } from '../component/theme/theme-type'

export type LLMNotifyMessageType =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'

const llmNotifyMessage: Record<LLMNotifyMessageType, string> = {
    waiting: 'Booting cognitive engine...',
    analyzing: 'Parsing input streams...',
    thinking: 'Orchestrating neural processes...',
    rendering: 'Assembling response framework...',
    error: 'System protocol violation',
    completed: 'Cognitive cycle complete',
}

const llmNotifyMessageColor: Record<LLMNotifyMessageType, TerminalColorName> = {
    waiting: 'cyan',
    analyzing: 'yellow',
    thinking: 'magenta',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
}

const message = (role: LLMRole, content: string): LLMMessage => {
    return {
        role,
        content,
    }
}
const user = (content: string): LLMMessage => {
    return message('user', content)
}

const system = (content: string): LLMMessage => {
    return message('system', content)
}

const assistant = (content: string): LLMMessage => {
    return message('assistant', content)
}

export {
    llmNotifyMessage,
    llmNotifyMessageColor,
    assistant,
    message,
    system,
    user,
}
