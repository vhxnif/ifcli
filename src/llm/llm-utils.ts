import type { TableUserConfig } from 'table'
import { tableConfig } from '../util/common-utils'
import { table } from 'table'
import { color } from '../util/color-utils'
import { default as page } from './llm-res-prompt'

const thinkTableHeader = color.sky('Thinking Content')
const contentTableHeader = color.sky('Assistant Content')

export type LLMResultPageShow = {
    assistantContent: string[]
    thinkingContent?: string[]
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
    }) as TableUserConfig

const llmTableShow = (param: TableShowParam) => {
    const { header, content, notifyInfo } = param
    return content.map((it) => {
        const tableStr = table([[it]], llmTableConfigWithHeader(header))
        return notifyInfo ? `${notifyInfo}\n${tableStr}` : tableStr
    })
}

const llmResultPageShow = async (param: LLMResultPageShow) => {
    const { assistantContent, thinkingContent, notifyInfo } = param
    const contentPageShow = llmTableShow({
        header: contentTableHeader,
        content: assistantContent,
        notifyInfo,
    })
    if (thinkingContent) {
        await page({
            content: contentPageShow,
            think: llmTableShow({
                header: thinkTableHeader,
                content: thinkingContent,
                notifyInfo,
            }),
        })
        return
    }
    await page({ content: contentPageShow })
}

const llmNotifyMessage = {
    waiting: color.blue('[量子信道开启中，正在折叠时空距离...]'),
    analyzing: color.blue('[语义引力阱已捕获请求，正在解压超弦信号...]'),
    thinking: color.blue('[核心矩阵激活，正在遍历知识星云...]'),
    rendering: color.blue('[全息投影就绪，正在渲染多维信息流——*]'),
    error: color.blue('[遭遇未知粒子风暴，正在重新校准频率...]'),
    completed: color.blue('[认知模块已同步，思维链路无延迟——*]'),
}

export {
    thinkTableHeader,
    contentTableHeader,
    llmTableConfig,
    llmNotifyMessage,
    llmTableConfigWithHeader,
    llmResultPageShow,
    llmTableShow,
}
