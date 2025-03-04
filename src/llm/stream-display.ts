import type OpenAI from "openai"
import { table } from "table"
import { tableConfig } from "../util/common-utils"
import { color } from "../util/color-utils"

export class StreamDisplay {

    private winRowLimit: number = 8
    private previousOutputLineCount: number = 0
    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private thinkStopFlag: boolean = false
    private thinkReasoning: string[] = []
    private contentFun: (str: string) => void

    constructor(contentConsumer: (str: string) => void, thinkWinRowLinit?: number) {
        this.contentFun= contentConsumer
        if (thinkWinRowLinit) {
            this.winRowLimit = thinkWinRowLinit
        }
    }

    process = (chunk: OpenAI.Chat.Completions.ChatCompletionChunk) => {
        const delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
            reasoning_content?: string
        } = chunk.choices[0]?.delta
            const reasoning = delta.reasoning_content || ''
            const content = delta.content || ''
            if (reasoning) {
                this.hasReasoningContent = true
                // think start
                this.think(reasoning)
            }
            const combinedChunks = this.lastChunk + content
            this.lastChunk = content
            // 检测思考结束
            if (
                combinedChunks.includes('###Response') ||
                content === '</think>'
            ) {
                // think stop
                this.stopThink()
            }
            // 如果之前有reasoning_content，现在有普通content，说明思考结束
            if (this.hasReasoningContent && content) {
                // think stop
                this.stopThink()
            }
            if (content) {
                this.contentFun(content)
            }
    }

    private think = (reasoning: string) => {
        this.thinkReasoning.push(reasoning)
        const thinking = this.thinkReasoning.join('').split('\n')
        let tableContent = ''
        if (thinking.length < this.winRowLimit) {
            tableContent = thinking.join('\n')
        } else {
            tableContent = thinking.slice(thinking.length - this.winRowLimit).join('\n')
        }
        const tableStr = table([[color.flamingo(tableContent)]], tableConfig({ cols: [1], celConfig: [{ alignment: 'left'}] }))
        this.previousOutputLineCount = tableStr.split('\n').length - 1
        this.clearScreen()
        process.stdout.write(`${tableStr}`)
    }

    private clearScreen = () => {
        if (this.previousOutputLineCount > 0) {
            // 光标上移 N 行（回到表格起始位置）
            process.stdout.write(`\x1B[${this.previousOutputLineCount}A`)
            // 清除从光标到屏幕结束的内容
            process.stdout.write('\x1B[0J')
        }
    }

    private stopThink = () => {
        if(this.thinkStopFlag) {
            return
        }
        this.thinkStopFlag = true
    }

}