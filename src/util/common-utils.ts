/* eslint-disable @typescript-eslint/no-unused-vars */
import { select } from '@inquirer/prompts'
import { input } from '@inquirer/prompts'
import moment from 'moment'
import { display } from './color-utils'
import { table } from 'table'
import type { TableUserConfig } from 'table'

const terminal: Record<string, number> = {
    column: process.stdout.columns,
    row: process.stdout.rows,
}

const { tip, important } = display
const print = (str: string) => process.stdout.write(str)
const println = console.log
const error = console.error
const unixnow = (): number => moment().unix()
const containsChinese = (str: string): boolean => /[\u4e00-\u9fa5]/.test(str)
const textColor = (text: string): void =>
    println(
        text
            .replace(/(<[^>]+>)/g, (match) => tip(match)) // Apply green color to <>
            .replace(/(\[[^\]]+\])/g, (match) => important(match)) // Apply pink color to []
    )
const selectRun = async (
    message: string,
    choices: { name: string; value: string }[],
    f: (str: string) => void
) => f(await select({ message, choices }))
const inputRun = async (message: string, f: (str: string) => void) =>
    f(await input({ message }))

const optionFunMapping = (
    options: { [x: string]: unknown },
    map: Record<string, (str: unknown) => void>,
    df?: () => void
) => {
    const opt = Object.entries(options).find(([_, v]) => v)
    if (opt) {
        const [key, value] = opt
        map[`${key}`]?.(value)
        return
    }
    df?.()
}

const sum = (numbers: number[]) => numbers.reduce((sum, it) => (sum += it), 0)
const tableDefaultConfig: TableUserConfig = {
    border: {
        topBody: `─`,
        topJoin: `┬`,
        topLeft: `╭`,
        topRight: `╮`,

        bottomBody: `─`,
        bottomJoin: `┴`,
        bottomLeft: `╰`,
        bottomRight: `╯`,

        bodyLeft: `│`,
        bodyRight: `│`,
        bodyJoin: `│`,

        joinBody: `─`,
        joinLeft: `├`,
        joinRight: `┤`,
        joinJoin: `┼`,
    },
}

const tableConfig = ({
    cols,
    maxColumn = 70,
}: {
    cols: number[]
    maxColumn?: number
}): TableUserConfig => {
    const allPart = sum(cols)
    const curCol = terminal.column - 4 * cols.length
    const colNum = curCol > maxColumn ? maxColumn : curCol
    const calWidth = cols.map((it) => Math.floor(colNum * (it / allPart)))
    return {
        ...tableDefaultConfig,
        columns: calWidth.map((it) => ({
            alignment: 'center',
            width: it,
        })),
    }
}

const printTable = (data: unknown[][], userConfig?: TableUserConfig) =>
    console.log(table(data, userConfig))

export {
    unixnow,
    containsChinese,
    optionFunMapping,
    print,
    println,
    error,
    selectRun,
    inputRun,
    textColor,
    printTable,
    tableConfig,
}
