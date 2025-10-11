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

const message = (role: LLMRole, content: string): LLMMessage => ({
    role,
    content,
})
const user = (content: string): LLMMessage => message('user', content)

const system = (content: string): LLMMessage => message('system', content)

const assistant = (content: string): LLMMessage => message('assistant', content)

export {
    assistant,
    llmNotifyMessage,
    llmNotifyMessageColor,
    message,
    system,
    user,
}
