import type {
    TerminalColorName,
    ThemeSemanticColors,
} from '../component/theme/theme-type'
import type { LLMMessage, LLMRole } from './llm-types'

export type LLMNotifyMessageType =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'
    | 'toolCalling'

const llmNotifyMessage: Record<LLMNotifyMessageType, string> = {
    waiting: 'Booting cognitive engine...',
    analyzing: 'Parsing input streams...',
    thinking: 'Orchestrating neural processes...',
    rendering: 'Assembling response framework...',
    error: 'System protocol violation',
    completed: 'Cognitive cycle complete',
    toolCalling: 'Calling tool...',
}

const defaultSemanticColors: ThemeSemanticColors = {
    waiting: 'cyan',
    analyzing: 'yellow',
    thinking: 'magenta',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
    toolCalling: 'yellow',
}

const llmNotifyMessageColor: Record<LLMNotifyMessageType, TerminalColorName> = {
    waiting: 'cyan',
    analyzing: 'yellow',
    thinking: 'magenta',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
    toolCalling: 'yellow',
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

const getSemanticColor = (
    semanticColors: ThemeSemanticColors | undefined,
    type: LLMNotifyMessageType,
): TerminalColorName => {
    return semanticColors?.[type] ?? defaultSemanticColors[type]
}

export {
    assistant,
    defaultSemanticColors,
    getSemanticColor,
    llmNotifyMessage,
    llmNotifyMessageColor,
    message,
    system,
    user,
}
