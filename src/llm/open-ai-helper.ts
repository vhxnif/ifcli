import type OpenAI from 'openai'
import type {
    ChatCompletionChunk,
    ChatCompletionFunctionTool,
    ChatCompletionMessage,
    ChatCompletionMessageParam,
} from 'openai/resources'
import type { MessageContent } from '../store/store-types'
import { uuid } from '../util/common-utils'
import type { ToolDef } from './mcp-client'

type DSDelta = OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
    reasoning_content?: string
    reasoning?: string
}

type DSChatCompletionMessage = ChatCompletionMessage & {
    reasoning_content?: string
}

type MessageParam = ChatCompletionMessageParam & {
    reasoning_content: string
}

type StreamEvent = {
    type:
        | 'delta_reasoning'
        | 'delta_content'
        | 'message_done'
        | 'content'
        | 'reasoning'
        | 'toolcall'
        | 'toolcall_result'
    value: string | any
}

function messageReducer(
    previous: ChatCompletionMessage,
    item: ChatCompletionChunk,
): DSChatCompletionMessage {
    const reduce = (acc: any, delta: DSDelta) => {
        acc = { ...acc }
        for (const [key, value] of Object.entries(delta)) {
            if (acc[key] === undefined || acc[key] === null) {
                acc[key] = value
                //  OpenAI.Chat.Completions.ChatCompletionMessageToolCall does not have a key, .index
                if (Array.isArray(acc[key])) {
                    for (const arr of acc[key]) {
                        delete arr.index
                    }
                }
            } else if (
                typeof acc[key] === 'string' &&
                typeof value === 'string'
            ) {
                acc[key] += value
            } else if (
                typeof acc[key] === 'number' &&
                typeof value === 'number'
            ) {
                acc[key] = value
            } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
                const accArray = acc[key]
                for (let i = 0; i < value.length; i++) {
                    const { index, ...chunkTool } = value[i]
                    if (index - accArray.length > 1) {
                        throw new Error(
                            `Error: An array has an empty value when tool_calls are constructed. tool_calls: ${accArray}; tool: ${value}`,
                        )
                    }
                    accArray[index] = reduce(accArray[index], chunkTool)
                }
            } else if (
                typeof acc[key] === 'object' &&
                typeof value === 'object'
            ) {
                acc[key] = reduce(acc[key], value)
            }
        }
        return acc
    }
    const choice = item.choices[0]
    if (!choice) {
        // chunk contains information about usage and token counts
        return previous
    }
    return reduce(previous, choice.delta) as ChatCompletionMessage
}

function toStoreMessage(
    topicId: string,
    msgs: MessageParam[],
): MessageContent[] {
    const pairKey = uuid()
    return msgs
        .filter((it) => it.role !== 'tool')
        .flatMap((it) => {
            if (it.role === 'user') {
                return [
                    {
                        topicId,
                        role: 'user',
                        content: it.content as string,
                        pairKey,
                    },
                ] as MessageContent[]
            }
            if (it.role === 'assistant') {
                const arr: MessageContent[] = []
                if (it.reasoning_content) {
                    arr.push({
                        topicId,
                        role: 'reasoning',
                        content: it.reasoning_content,
                        pairKey,
                    })
                }
                if (it.content) {
                    arr.push({
                        topicId,
                        role: 'assistant',
                        content: it.content as string,
                        pairKey,
                    })
                }
                if (it.tool_calls) {
                    const tools = it.tool_calls
                    arr.push({
                        topicId,
                        role: 'toolscall',
                        content: JSON.stringify(
                            tools.map((t) => {
                                const f = t as ChatCompletionFunctionTool
                                return {
                                    function: f.function,
                                    result: msgs.find(
                                        (m) =>
                                            m.role === 'tool' &&
                                            m.tool_call_id === t.id,
                                    )?.content,
                                }
                            }),
                        ),
                        pairKey,
                    })
                }
                return arr
            }
            return []
        })
}

async function stream(
    client: OpenAI,
    {
        messages,
        model,
        temperature,
    }: {
        messages: ChatCompletionMessageParam[]
        model: string
        temperature: number
    },
    callback: (event: StreamEvent) => void,
) {
    const msgs = messages
    const stream = await client.chat.completions.create({
        messages: msgs,
        model,
        temperature,
        stream: true,
    })
    let message = {} as DSChatCompletionMessage
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as DSDelta
        const reasoning = delta.reasoning || delta.reasoning_content || ''
        const content = delta.content || ''
        if (reasoning) {
            callback({ type: 'delta_reasoning', value: reasoning })
        }
        if (content) {
            callback({ type: 'delta_content', value: content })
        }
        message = messageReducer(message, chunk)
    }
    callback({ type: 'message_done', value: message })
    msgs.push(message)
    const { content, reasoning_content } = message
    if (reasoning_content) {
        callback({ type: 'reasoning', value: reasoning_content })
    }
    if (content) {
        callback({ type: 'content', value: content })
    }
    return msgs as MessageParam[]
}

async function streamTools(
    client: OpenAI,
    {
        messages,
        model,
        temperature,
        tools,
    }: {
        messages: ChatCompletionMessageParam[]
        model: string
        temperature: number
        tools: ToolDef[]
    },
    callback: (event: StreamEvent) => void,
) {
    const msgs = messages
    while (true) {
        const stream = await client.chat.completions.create({
            model,
            messages: msgs,
            temperature,
            tools: tools.map((it) => it.def),
            stream: true,
        })
        let message = {} as DSChatCompletionMessage
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta as DSDelta
            const reasoning = delta?.reasoning || delta?.reasoning_content || ''
            const content = delta?.content || ''
            if (reasoning) {
                callback({ type: 'delta_reasoning', value: reasoning })
            }
            if (content) {
                callback({ type: 'delta_content', value: content })
            }
            message = messageReducer(message, chunk)
        }
        callback({ type: 'message_done', value: message })
        msgs.push(message)
        if (!message.tool_calls) {
            const { content, reasoning_content } = message
            if (reasoning_content) {
                callback({ type: 'reasoning', value: reasoning_content })
            }
            if (content) {
                callback({ type: 'content', value: content })
            }
            return msgs as MessageParam[]
        }
        for (const toolCall of message.tool_calls) {
            if (toolCall.type !== 'function') {
                throw new Error(`Unexpected tool call type: ${toolCall.type}`)
            }
            const f = toolCall.function
            const args = JSON.parse(f.arguments)
            callback({ type: 'toolcall', value: f })
            const result = await tools
                .find(
                    (it) =>
                        (it.def as ChatCompletionFunctionTool).function.name ===
                        f.name,
                )
                ?.call(args)
            const resultJson = JSON.stringify(result)
            callback({ type: 'toolcall_result', value: resultJson })
            const newMessage = {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                name: toolCall.function.name,
                content: resultJson,
            }
            msgs.push(newMessage)
        }
    }
}

export { messageReducer, type StreamEvent, stream, streamTools, toStoreMessage }
