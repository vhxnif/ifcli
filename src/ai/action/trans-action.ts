import { print, text, containsChinese } from '../../util/common-utils'
import { commonModel, stream, system, user } from '../open-ai-client'

const systemPrompt = `You are a professional, authentic machine translation engine. You only return the translated text, without any explanations.`

const userPrompt = (text: string, lang: string): string => `Translate the following text into ${lang}, output translation text directly without any extra information: \n ${text}`

const trans = async (content: string, lang: string): Promise<void> => {
    await stream(
        [system(systemPrompt), user(userPrompt(content, guessTargetLang(content, lang)))],
        commonModel,
        c => print(text(c))
    )
}

const guessTargetLang = (content: string, lang: string) : string => {
    if(!containsChinese(content) && lang === 'en') {
        return 'zh'
    }
    return lang
}


export { trans }
