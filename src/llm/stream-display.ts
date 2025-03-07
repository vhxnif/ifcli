import type { ChalkInstance } from "chalk"
import type OpenAI from "openai"
import { table } from "table"
import type { LLMMessage, LLMResult } from "../types/llm-types"
import { color } from "../util/color-utils"
import { llmNotifyMessage, llmResultPageShow, llmTableConfig, type LLMResultPageShow } from "./llm-utils"
import { ShowWin } from "./show-win"
import ora, { type Ora } from "ora"

export class StreamDisplay {

    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private thinkStopFlag: boolean = false
    private tableConfig = llmTableConfig 
    private thinkReasoning: ShowWin = new ShowWin()
    private contentColl: ShowWin = new ShowWin() 
    private messageStore: (result: LLMResult) => void
    private userMessage: LLMMessage 
    private spinner: Ora = ora(llmNotifyMessage.waiting)

    constructor({ userMessage, messageStore, thinkWinRowLinit } :{ userMessage: LLMMessage, messageStore: (result: LLMResult) => void, thinkWinRowLinit?: number}) {
        this.userMessage = userMessage
        this.messageStore = messageStore 
        if(thinkWinRowLinit) {
            this.thinkReasoning = new ShowWin(thinkWinRowLinit)
            this.contentColl = new ShowWin(thinkWinRowLinit)
        }
        this.spinner.start()
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

    contentShow = (content: string ) => {
        this.tableShow(content, this.contentColl, color.mauve, llmNotifyMessage.rendering)
    }

    pageShow = async () => {
        this.spinner.stop()
        this.doStoreMessage()
        const showParam: LLMResultPageShow = {
            assistantContent: this.contentColl.pageContent(), 
            notifyInfo: llmNotifyMessage.completed
        }
        if (!this.thinkReasoning.isEmpty()) {
            showParam.thinkingContent = this.thinkReasoning.pageContent()
        }
        await llmResultPageShow(showParam)
    }

    change = (str: string) => {
        this.spinner.text = str
    }

    error = () => {
        this.spinner.fail(llmNotifyMessage.error)
    }

    private think = (reasoning: string) => {
        this.tableShow(reasoning, this.thinkReasoning, color.green, llmNotifyMessage.thinking)
    }

    private tableShow = (content: string,  contentArray: ShowWin, colorShow: ChalkInstance, notice: string) => {
        contentArray.push(content)
        const tableStr = table([[contentArray.show(colorShow)]], this.tableConfig)
        this.spinner.text = `${notice}\n${tableStr}`
    }

    private stopThink = () => {
        if(this.thinkStopFlag) {
            return
        }
        this.thinkStopFlag = true
    }

    private doStoreMessage() {
        this.messageStore({
            userContent: this.userMessage.content,
            assistantContent: this.contentColl.content(),
            thinkingReasoning: this.thinkReasoning.content(), 
        })
    }
}