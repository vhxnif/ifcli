import type { LLMMessage, LLMRole } from './llm-types'
import type { CatppuccinColorName } from '../util/color-schema'

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

const llmNotifyMessageColor: Record<LLMNotifyMessageType, CatppuccinColorName> =
    {
        waiting: 'teal',
        analyzing: 'yellow',
        thinking: 'mauve',
        rendering: 'pink',
        error: 'red',
        completed: 'green',
    }

function message(role: LLMRole, content: string): LLMMessage {
    return {
        role,
        content,
    }
}
function user(content: string): LLMMessage {
    return message('user', content)
}

function system(content: string): LLMMessage {
    return message('system', content)
}

function assistant(content: string): LLMMessage {
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
