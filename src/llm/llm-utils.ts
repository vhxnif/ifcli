import type { TableUserConfig } from "table"
import { tableConfig } from "../util/common-utils"
import { table } from "table"
import type { ChalkInstance } from "chalk"
import { color } from "../util/color-utils"
import { default as page } from "./llm-res-prompt"


const llmTableConfig = tableConfig({ cols: [1], celConfig: [{ alignment: 'left' }] })

const llmTableConfigWithHeader =  (headerContent: string) => ({ ...llmTableConfig, header: { alignment: 'center', content: headerContent }}) as TableUserConfig

const llmResultPageShow = async (assistantContent: string[], thinkingContent?: string[]) => {
        const tableShow = (headerContent: string, str: string[], colorShow: ChalkInstance): string[] => {
            return str.map(it => table([[colorShow(it)]], llmTableConfigWithHeader(headerContent)))
        }
        const contentPageShow = tableShow(color.sky('Assistant Content'), assistantContent, color.mauve)
        if(thinkingContent) {
            await page({ content: contentPageShow, think: tableShow(color.sky('Thinking Content'), thinkingContent, color.green) } )
            return
        }
        await page({ content: contentPageShow } )
}

export {
    llmTableConfig,
    llmTableConfigWithHeader,
    llmResultPageShow
}
