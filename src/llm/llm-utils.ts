import type { LLMMessage, LLMRole } from '../types/llm-types'
import type { CatppuccinColorName } from '../util/color-schema'

export type LLMNotifyMessageType = 'waiting' | 'analyzing' | 'thinking' | 'rendering' | 'error' | 'completed'

const llmNotifyMessage: Record<LLMNotifyMessageType, string>  = {
    waiting: '[Quantum Channel Opening :: Bending Space-Time Continuum...]',
    analyzing:
        '[Semantic Gravity Well Locked :: Decrypting Hyperstring Resonance...]',
    thinking: '[Neural Matrix Active :: Traversing Knowledge Nebula...]',
    rendering:
        '[Holographic Interface Online :: Rendering Multidimensional Data Streams—*]',
    error: '[Unknown Particle Storm Detected :: Rebooting Chrono-Sync Protocols...]',
    completed:
        '[Cognitive Sync Module Engaged :: Neural Latency Neutralized—*]',
}

const llmNotifyMessageColor: Record<LLMNotifyMessageType, CatppuccinColorName> = {
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
