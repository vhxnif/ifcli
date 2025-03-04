import { $ } from 'bun'
import {
    TOOLS_IMPROVE_WRITING_SYSTEM,
    TOOLS_SUGGEST_SYSTEM,
} from '../config/prompt'
import type { IToolsAction } from '../types/action-types'
import { display } from '../util/color-utils'
import {
    containsChinese,
    error,
    inputRun,
    print,
    println,
} from '../util/common-utils'
import { temperature } from '../types/constant'
import type { ILLMClient } from '../types/llm-types'

export class ToolsAction implements IToolsAction {
    private client: ILLMClient
    constructor(client: ILLMClient) {
        this.client = client
    }

    suggest = async (content: string, excluded: string[] = []) => {
        const userMessage = this.client.user(
            excluded.length === 0
                ? content
                : `${content}
        排除以下命令：
        ${excluded}
        `
        )
        await this.client.call({
            messages: [this.client.system(TOOLS_SUGGEST_SYSTEM), userMessage],
            model: this.client.defaultModel(),
            temperature: temperature.codeOrMath[1],
            contentConsumer: async (c) => {
                inputRun(c, async (answer) => {
                    if (answer === 'next') {
                        await this.suggest(content, [...excluded, c])
                        return
                    }
                    const regex = /<([^>]+)>/g
                    const args = answer.split(' ')
                    let idx = 0
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const command = c.replace(regex, function (_match, _p1) {
                        return args[idx++]
                    })
                    try {
                        await $`${{ raw: command }}`
                    } catch (err) {
                        error(err)
                    }
                })
            },
        })
    }

    improve = async (content: string) => {
        println(display.note(content))
        await this.client.stream({
            messages: [
                this.client.system(TOOLS_IMPROVE_WRITING_SYSTEM),
                this.client.user(content),
            ],
            model: this.client.defaultModel(),
            temperature: temperature.writting[1],
            contentConsumer: (c) => print(display.note(c)),
        })
    }

    trans = async (content: string, lang: string) => {
        const systemPrompt = `You are a professional, authentic machine translation engine. You only return the translated text, without any explanations.`
        const userPrompt = (text: string, lang: string): string => {
            let guessLang = lang
            if (!containsChinese(content) && lang === 'en') {
                guessLang = 'zh'
            }
            return `Translate the following text into ${guessLang}, output translation text directly without any extra information: \n ${text}`
        }
        await this.client.stream({
            messages: [
                this.client.system(systemPrompt),
                this.client.user(userPrompt(content, lang)),
            ],
            model: this.client.defaultModel(),
            temperature: temperature.translate[1],
            contentConsumer: (c) => print(display.note(c)),
        })
    }
}
