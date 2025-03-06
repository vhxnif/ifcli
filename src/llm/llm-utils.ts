import type { TableUserConfig } from "table"
import { tableConfig } from "../util/common-utils"
import { table } from "table"
import type { ChalkInstance } from "chalk"
import { color } from "../util/color-utils"
import { default as page } from "./llm-res-prompt"

export type LLMResultPageShow = {
    assistantContent: string[], 
    thinkingContent?: string[],
    notifyInfo?: string,
}

const llmTableConfig = tableConfig({ cols: [1], celConfig: [{ alignment: 'left' }] })

const llmTableConfigWithHeader =  (headerContent: string) => ({ ...llmTableConfig, header: { alignment: 'center', content: headerContent }}) as TableUserConfig

const llmResultPageShow = async (param : LLMResultPageShow) => {
    const { assistantContent, thinkingContent, notifyInfo } = param
    const tableShow = (headerContent: string, str: string[], colorShow: ChalkInstance): string[] => str.map(it => {
        const tableStr = table([[colorShow(it)]], llmTableConfigWithHeader(headerContent))
        return notifyInfo ? `${notifyInfo}\n${tableStr}` : tableStr
    })
    const contentPageShow = tableShow(color.sky('Assistant Content'), assistantContent, color.mauve)
    if (thinkingContent) {
        await page({ content: contentPageShow, think: tableShow(color.sky('Thinking Content'), thinkingContent, color.green) })
        return
    }
    await page({ content: contentPageShow })
}

const llmNotifyMessage = {
    waiting: color.green("[量子信道开启中，正在折叠时空距离...]"),
    analyzing: color.green("[语义引力阱已捕获请求，正在解压超弦信号...]"),
    thinking: color.green("[核心矩阵激活，正在遍历知识星云...]"),
    rendering: color.green("[全息投影就绪，正在渲染多维信息流——*]"),
    error: color.green("[遭遇未知粒子风暴，正在重新校准频率...]"),
    completed: color.green("[认知模块已同步，思维链路无延迟——*]"),
}

export {
    llmTableConfig,
    llmNotifyMessage,
    llmTableConfigWithHeader,
    llmResultPageShow,
}
