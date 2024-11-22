import { select } from "@inquirer/prompts"
import moment from "moment"
import { display } from "./color-utils"

const { tip, important } = display

const print = (str: string) => process.stdout.write(str)
const println = console.log
const error = console.error
const unixnow = (): number => moment().unix()
const containsChinese = (str: string): boolean => /[\u4e00-\u9fa5]/.test(str)
const textColor = (text: string): void => {
    const regex = /(<[^>]+>)/g // Match text inside <>
    const regex1 = /(\[[^\]]+\])/g // Match text inside []

    const str = text
        .replace(regex, (match) => tip(match)) // Apply green color to <>
        .replace(regex1, (match) => important(match)) // Apply pink color to []
    println(str)
}

const selectRun = async (message: string, choices: { name: string, value: string }[], f: (str: string) => void) => f(await select({ message, choices }))

export {
    containsChinese,
    print,
    println,
    error,
    selectRun,
    textColor,
    unixnow
}

