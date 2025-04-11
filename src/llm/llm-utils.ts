import type { LLMMessage, LLMRole } from '../types/llm-types'
import { color } from '../util/color-utils'

const llmNotifyMessage = {
    waiting: color.blue(
        '[Quantum Channel Opening :: Bending Space-Time Continuum...]'
    ),
    analyzing: color.blue(
        '[Semantic Gravity Well Locked :: Decrypting Hyperstring Resonance...]'
    ),
    thinking: color.blue(
        '[Neural Matrix Active :: Traversing Knowledge Nebula...]'
    ),
    rendering: color.blue(
        '[Holographic Interface Online :: Rendering Multidimensional Data Streams—*]'
    ),
    error: color.blue(
        '[Unknown Particle Storm Detected :: Rebooting Chrono-Sync Protocols...]'
    ),
    completed: color.blue(
        '[Cognitive Sync Module Engaged :: Neural Latency Neutralized—*]'
    ),
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
    message,
    system,
    user
}

