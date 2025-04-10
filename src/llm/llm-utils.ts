import type { TableUserConfig } from 'table'
import { table } from 'table'
import { default as page } from '../component/llm-res-prompt'
import type { LLMMessage, LLMRole } from '../types/llm-types'
import { color } from '../util/color-utils'
import { tableConfig } from '../util/table-util'

const thinkTableHeader = color.sky('Thinking Content')
const contentTableHeader = color.sky('Assistant Content')

export type LLMResultPageShow = {
    pageAssistantContent: string[]
    assistantContent: string
    pageThinkingContent?: string[]
    thinkingContent?: string
    notifyInfo?: string
}

export type TableShowParam = {
    header: string
    content: string[]
    notifyInfo?: string
}

const llmTableConfig = tableConfig({
    cols: [1],
    celConfig: [{ alignment: 'left' }],
})

const llmTableConfigWithHeader = (headerContent: string) =>
    ({
        ...llmTableConfig,
        header: { alignment: 'center', content: headerContent },
    } as TableUserConfig)

const llmTableShow = (param: TableShowParam) => {
    const { header, content, notifyInfo } = param
    return content.map((it) => {
        const tableStr = table([[it]], llmTableConfigWithHeader(header))
        return notifyInfo ? `${notifyInfo}\n${tableStr}` : tableStr
    })
}

const llmResultPageShow = async (param: LLMResultPageShow) => {
    const {
        pageAssistantContent,
        assistantContent,
        pageThinkingContent,
        thinkingContent,
        notifyInfo,
    } = param
    const contentPageShow = llmTableShow({
        header: contentTableHeader,
        content: pageAssistantContent,
        notifyInfo,
    })
    if (pageThinkingContent) {
        await page({
            content: contentPageShow,
            sourceContent: assistantContent,
            think: llmTableShow({
                header: thinkTableHeader,
                content: pageThinkingContent,
                notifyInfo,
            }),
            sourceThink: thinkingContent,
        })
        return
    }
    await page({ content: contentPageShow, sourceContent: assistantContent })
}

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
    contentTableHeader,
    llmNotifyMessage,
    llmResultPageShow,
    llmTableConfig,
    llmTableConfigWithHeader,
    llmTableShow,
    message,
    system,
    thinkTableHeader,
    user,
}
