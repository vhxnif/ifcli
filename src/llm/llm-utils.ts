import type { LLMMessage, LLMRole } from '../types/llm-types'
import { color } from '../util/color-utils'

const llmNotifyMessage = {
    waiting: color.teal(
        '[Quantum Channel Opening :: Bending Space-Time Continuum...]'
    ),
    analyzing: color.yellow(
        '[Semantic Gravity Well Locked :: Decrypting Hyperstring Resonance...]'
    ),
    thinking: color.mauve(
        '[Neural Matrix Active :: Traversing Knowledge Nebula...]'
    ),
    rendering: color.pink(
        '[Holographic Interface Online :: Rendering Multidimensional Data Streams—*]'
    ),
    error: color.red(
        '[Unknown Particle Storm Detected :: Rebooting Chrono-Sync Protocols...]'
    ),
    completed: color.green(
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

