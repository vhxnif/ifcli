
import OpenAi from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import { getEnv } from '../util/common-utils'

const client = new OpenAi({
    baseURL: getEnv('OPENAI_BASE_URL'),
    apiKey: getEnv('OPENAI_API_KEY'),
})

const commonModel = getEnv('OPENAI_MODEL')
const coderModel = getEnv('CODER_MODEL')

const system = (prompt: string): ChatCompletionMessageParam => {
    return {
        role: 'system',
        content: prompt
    }
}

const user = (message: string): ChatCompletionMessageParam => {
    return {
        role: 'user',
        content: message
    }
}

const assistant = (content: string): ChatCompletionMessageParam => {
    return {
        role: 'assistant',
        content: content
    }
}

const roleParam = {
    'user': user,
    'system': system, 
    'assistant': assistant
}

const call = async (
    messages: Array<ChatCompletionMessageParam>,
    model: string,
    fun: (content: string) => void
): Promise<void> => {
    await client.chat.completions.create({
        messages: messages,
        model: model,
    })
        .then(it => fun(it.choices[0]?.message?.content ?? ''))
        .catch(err => console.error(err))
}

const stream = async (
    messages: Array<ChatCompletionMessageParam>,
    codeModel: string,
    fun: (content: string) => void
): Promise<void> => {
    const stream = await client.chat.completions.create({
        model: codeModel,
        messages: messages,
        stream: true,
    });
    for await (const part of stream) {
        fun(part.choices[0]?.delta?.content || '')
    }
}

export { roleParam, user, system, assistant, call, stream, coderModel, commonModel }

