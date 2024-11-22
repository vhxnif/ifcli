import { input } from "@inquirer/prompts";
import { TOOLS_IMPROVE_WRITING_SYSTEM, TOOLS_SUGGEST_SYSTEM } from "../config/prompt";
import type { IToolsAction } from "../types/action-types";
import type { ILLMClient } from "../types/llm-types";
import { $ } from "bun";
import { print, error, println, sourceText, text, containsChinese } from "../util/common-utils";

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
        );
        await this.client.call(
            [this.client.system(TOOLS_SUGGEST_SYSTEM), userMessage],
            this.client.coderModel(),
            async c => {
                const answer = await input({ message: c });
                if (answer === 'next') {
                    await this.suggest(content, [...excluded, c])
                    return
                }
                const regex = /<([^>]+)>/g;
                const args = answer.split(' ')
                let idx = 0
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const command = c.replace(regex, function (match, p1) {
                    return args[idx++]
                })
                try {
                    await $`${{ raw: command }}`
                } catch (err) {
                    error(err)
                }
            }
        )
    }

    improve = async (content: string) => {
        println(sourceText(content))
        await this.client.stream(
            [this.client.system(TOOLS_IMPROVE_WRITING_SYSTEM), this.client.user(content)],
            this.client.chatModel(),
            c => print(text(c))
        )
    }

    trans = async (content: string, lang: string) => {
        const systemPrompt = `You are a professional, authentic machine translation engine. You only return the translated text, without any explanations.`
        const userPrompt = (text: string, lang: string): string => `Translate the following text into ${lang}, output translation text directly without any extra information: \n ${text}`
        const guessTargetLang = (content: string, lang: string): string => {
            if (!containsChinese(content) && lang === 'en') {
                return 'zh'
            }
            return lang
        }
        await this.client.stream(
            [this.client.system(systemPrompt), this.client.user(userPrompt(content, guessTargetLang(content, lang)))],
            this.client.chatModel(),
            c => print(text(c))
        )
    }

}