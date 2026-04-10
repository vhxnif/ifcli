import type { Color } from 'ora'
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
    waiting: 'Thinking...',
    analyzing: 'Analyzing...',
    thinking: 'Thinking...',
    rendering: 'Responding...',
    error: 'Error',
    completed: 'Done',
    toolCalling: 'Calling tool...',
}

const defaultSemanticColors: ThemeSemanticColors = {
    waiting: 'blue',
    analyzing: 'yellow',
    thinking: 'cyan',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
    toolCalling: 'magenta',
}

const llmNotifyMessageColor: Record<LLMNotifyMessageType, TerminalColorName> = {
    waiting: 'blue',
    analyzing: 'yellow',
    thinking: 'cyan',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
    toolCalling: 'magenta',
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
): Color => {
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
