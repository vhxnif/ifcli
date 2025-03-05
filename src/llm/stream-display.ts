import type { ChalkInstance } from "chalk"
import type OpenAI from "openai"
import { table } from "table"
import type { LLMMessage, LLMResult } from "../types/llm-types"
import { color } from "../util/color-utils"
import { llmResultPageShow, llmTableConfig } from "./llm-utils"
import { ShowWin } from "./show-win"

export class StreamDisplay {

    private previousOutputLineCount: number = 0
    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private thinkStopFlag: boolean = false
    private tableConfig = llmTableConfig 
    private thinkReasoning: ShowWin = new ShowWin()
    private contentColl: ShowWin = new ShowWin() 
    private messageStore: (result: LLMResult) => void
    private userMessage: LLMMessage 

    constructor({ userMessage, messageStore, thinkWinRowLinit } :{ userMessage: LLMMessage, messageStore: (result: LLMResult) => void, thinkWinRowLinit?: number}) {
        this.userMessage = userMessage
        this.messageStore = messageStore 
        if(thinkWinRowLinit) {
            this.thinkReasoning = new ShowWin(thinkWinRowLinit)
            this.contentColl = new ShowWin(thinkWinRowLinit)
        }
    }

    thinkingShow = (chunk: OpenAI.Chat.Completions.ChatCompletionChunk) => {
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
                this.contentShow(content)
            }
    }

    private think = (reasoning: string) => {
        this.tableShow(reasoning, this.thinkReasoning, color.green)
    }

    private tableShow = (content: string,  contentArray: ShowWin, colorShow: ChalkInstance) => {
        contentArray.push(content)
        this.clearScreen()
        const tableStr = table([[colorShow(contentArray.show())]], this.tableConfig)
        this.previousOutputLineCount = tableStr.split('\n').length - 1
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
        this.clearScreen()
        this.previousOutputLineCount = 0
    }

    contentShow = (content: string ) => {
        this.tableShow(content, this.contentColl, color.mauve)
    }

    pageShow = async () => {
        this.doStoreMessage()
        this.clearScreen()
        if (!this.thinkReasoning.isEmpty()) {
            await llmResultPageShow(this.contentColl.pageContent(), this.thinkReasoning.pageContent())
            return
        }
        await llmResultPageShow(this.contentColl.pageContent(),)
    }

    private doStoreMessage() {
        this.messageStore({
            userContent: this.userMessage.content,
            assistantContent: this.contentColl.content(),
            thinkingReasoning: this.thinkReasoning.content(), 
        })
    }
}