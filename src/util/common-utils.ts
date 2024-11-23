import { select } from "@inquirer/prompts"
import { input } from '@inquirer/prompts'
import moment from "moment"
import { display } from "./color-utils"

const { tip, important } = display
const print = (str: string) => process.stdout.write(str)
const println = console.log
const error = console.error
const unixnow = (): number => moment().unix()
const containsChinese = (str: string): boolean => /[\u4e00-\u9fa5]/.test(str)
const textColor = (text: string): void => println(
    text
        .replace(/(<[^>]+>)/g, (match) => tip(match)) // Apply green color to <>
        .replace(/(\[[^\]]+\])/g, (match) => important(match)) // Apply pink color to []
)
const selectRun = async (message: string, choices: { name: string, value: string }[], f: (str: string) => void) => f(await select({ message, choices }))
const inputRun = async (message: string, f: (str: string) => void) => f(await input({ message }))

export {
    unixnow,
    containsChinese,
    print,
    println,
    error,
    selectRun,
    inputRun,
    textColor,
}

