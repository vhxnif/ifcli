import { type ChalkInstance } from 'chalk'
import type OpenAI from 'openai'
import type { LLMResultChunk } from '../types/llm-types'
import { color } from '../util/color-utils'
import { jsonformat, print } from '../util/common-utils'
import { llmNotifyMessage } from './llm-utils'
import { OraShow } from './ora-show'
import { SplitLine } from './split-line'

export class Display {
    private beforeAssistantDraw: boolean = false
    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private thinkStopFlag: boolean = false
    private oraShow = new OraShow(llmNotifyMessage.waiting)
    private reasoning: string[] = []
    private assistant: string[] = []
    private tools: string[] = []
    private assistantSplit: SplitLine = new SplitLine({
        title: 'Assistant Content',
        newLine: true,
    })
    private thinkSplit: SplitLine = new SplitLine({ title: 'Reasoning' })

    constructor() {
        this.oraShow.start()
    }

    result = (): LLMResultChunk => {
        return {
            tools: this.tools,
            assistant: this.assistant,
            reasoning: this.reasoning,
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
        if (combinedChunks.includes('###Response') || content === '</think>') {
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

    contentShow = (content: string) => {
        this.oraShow.stop()
        if (this.beforeAssistantDraw) {
            this.assistantSplit.draw()
        }
        this.textShow(content, this.assistant, color.mauve)
    }

    toolCall = (name: string, args: string) => {
        this.oraShow.stop()
        const argsStr = jsonformat(args)
        this.tools.push(
            `- **name**\n - ${name}\n\n- **request**\n - ${argsStr}\n\n`
        )
        new SplitLine({ title: name, multiPrint: true }).draw()
        this.beforeAssistantDraw = true
        print(`${color.yellow.bold('Request:')}\n${color.green(argsStr)}\n\n`)
        this.oraShow.start(llmNotifyMessage.thinking)
    }

    toolCallReult = (content: string) => {
        this.oraShow.stop()
        const ct = jsonformat(content)
        this.tools.push(`- **result**\n - ${ct}\n`)
        this.beforeAssistantDraw = true
        print(`${color.yellow.bold('Response:')}\n${color.blue(ct)}\n`)
        this.oraShow.start(llmNotifyMessage.rendering)
    }

    stop = () => {
        this.oraShow.stop()
        return this
    }

    change = (str: string) => {
        this.oraShow.show(str)
    }

    error = () => {
        this.oraShow.fail(llmNotifyMessage.error)
    }

    private think = (reasoning: string) => {
        this.oraShow.stop()
        this.thinkSplit.draw()
        this.beforeAssistantDraw = true
        this.textShow(reasoning, this.reasoning, color.green)
    }

    private textShow = (
        content: string,
        contentArray: string[],
        colorShow: ChalkInstance
    ) => {
        contentArray.push(content)
        print(colorShow(content))
    }

    private stopThink = () => {
        if (this.thinkStopFlag) {
            return
        }
        this.oraShow.stop()
        this.thinkStopFlag = true
    }
}
