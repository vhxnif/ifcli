import { type ChalkInstance } from 'chalk'
import type OpenAI from 'openai'
import type { LLMMessage, LLMResult } from '../types/llm-types'
import { color } from '../util/color-utils'
import { print } from '../util/common-utils'
import { llmNotifyMessage } from './llm-utils'
import { OraShow } from './ora-show'
import { SplitLine } from './split-line'

export class StreamDisplay {
    private hasReasoningContent: boolean = false
    private lastChunk: string = ''
    private thinkStopFlag: boolean = false
    private messageStore: (result: LLMResult) => void
    private userMessage: LLMMessage
    private oraShow = new OraShow(llmNotifyMessage.waiting)
    private reasoning: string[] = []
    private assistant: string[] = []
    private tools: string[] = []
    private assistantSplit: SplitLine = new SplitLine({ title: "Assistant Content" })
    private thinkSplit: SplitLine = new SplitLine({ title: "Reasoning" })

    constructor({
        userMessage,
        messageStore,
    }: {
        userMessage: LLMMessage
        messageStore: (result: LLMResult) => void
    }) {
        this.userMessage = userMessage
        this.messageStore = messageStore
        this.oraShow.start()
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
        this.assistantSplit.draw()
        this.textShow(content, this.assistant, color.mauve)
    }

    toolCall = (name: string, args: string) => {
        this.oraShow.stop()
        this.tools.push(`**name**\n${name}\n\n**request**\n${args}\n\n`)
        new SplitLine({ title: name, multiPrint: true}).draw()
        print(`\n${color.green(args)}\n`)
        this.oraShow.start(llmNotifyMessage.thinking)
    }

    toolCallReult = (content: string) => {
        this.oraShow.stop()
        this.tools.push(`**result**\n${content}\n\n`)
        print(`\n${color.blue(content)}\n`)
        this.oraShow.start(llmNotifyMessage.rendering)
    }

    stop = async () => {
        this.oraShow.stop()
        this.doStoreMessage()
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

    private doStoreMessage() {
        this.messageStore({
            userContent: this.userMessage.content,
            assistantContent: this.content(this.assistant),
            thinkingReasoning: `${this.content(this.reasoning)}${this.content(this.tools)}`,
        })
    }

    private content(arr: string[]) {
        return arr.join('')
    }
}
