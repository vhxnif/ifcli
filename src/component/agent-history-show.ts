import type {
    AssistantMessage,
    Message,
    ToolCall,
    ToolResultMessage,
    UserMessage,
} from '@earendil-works/pi-ai'
import type { ChalkInstance } from 'chalk'
import type { TerminalColorName } from './theme/theme-type'

const userContent = (
    content: UserMessage['content'],
    color: Record<TerminalColorName, ChalkInstance>,
) => {
    const { cyan } = color
    if (typeof content === 'string') return cyan(content)
    return content
        .map((c) => (c.type === 'text' ? cyan(c.text) : cyan.bold('[image]')))
        .join('\n\n')
}

const assistantContent = (
    content: AssistantMessage['content'],
    color: Record<TerminalColorName, ChalkInstance>,
    callback: (c: ToolCall) => void,
) => {
    const { white, gray } = color
    return content
        .map((c) => {
            if (c.type === 'text') return white(c.text)
            if (c.type === 'toolCall') {
                callback(c)
                return ''
            }
            if (c.type === 'thinking') return gray(c.thinking)
            return '' // thinking 内容默认不展示
        })
        .filter(Boolean)
        .join('\n\n')
}

const toolResult = (
    message: ToolResultMessage,
    color: Record<TerminalColorName, ChalkInstance>,
    toolCall: (toolCallId: string) => ToolCall | undefined,
) => {
    const { magenta, gray } = color
    const { toolCallId, content } = message
    const c = toolCall(toolCallId)
    if (!c) {
        return ''
    }
    const args = `${magenta.italic(c.name)}(${gray.italic(JSON.stringify(c.arguments))})`
    const results = content
        .flatMap((c) => (c.type === 'text' ? displayBlock(c.text) : '[image]'))
        .join('\n\n')
    return `${args}\n${magenta.italic('Result:')}\n${gray.italic(results)}`
}

const displayBlock = (str: string) => {
    const lines = str.split('\n')
    if (lines.length <= 15) {
        return str
    }
    return [...lines.slice(0, 5), '...', ...lines.slice(lines.length - 5)].join(
        '\n',
    )
}

const show = (
    color: Record<TerminalColorName, ChalkInstance>,
    message: Message,
    toolCallMap: Map<string, ToolCall>,
) => {
    const { yellow, blue, gray } = color
    const { role, content, timestamp } = message
    const ts = timestamp ? new Date(timestamp).toLocaleString() : ''
    const prefix = {
        user: blue.bold('You'),
        toolResult: void 0,
        assistant: yellow.bold('Assistant'),
    }
    const title = `${prefix[role]} ${gray.underline(`[${ts}]`)}`
    if (role === 'user') {
        return `${title}\n${userContent(content, color)}\n`
    }
    if (role === 'assistant') {
        return `${title}\n${assistantContent(content, color, (c) => toolCallMap.set(c.id, c))}`
    }
    if (role === 'toolResult') {
        return `${toolResult(message, color, (id) => toolCallMap.get(id))}`
    }
    return ''
}

export { show }
