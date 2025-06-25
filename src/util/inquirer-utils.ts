import input from '@inquirer/input'
import select from '@inquirer/select'
import type { CatppuccinColorName } from './color-schema'
import type { ChalkInstance } from 'chalk'

export type Choice<V> = {
    name: string
    value: V
    description?: string
    disabled?: boolean | string
}

const selectRun = async <V>(
    message: string,
    choices: Choice<V>[],
    f: (str: V) => void
) => {
    const v = await select({ message, choices })
    f(v)
}

const themeStyle = (ds: Record<CatppuccinColorName, ChalkInstance>) => {
    return {
        style: {
            disabled: (text: string) => `- ${ds.maroon(text)}`,
            description: (text: string) => ds.mauve(text),
        },
    }
}

const inputRun = async (message: string, f: (str: string) => void) =>
    f(await input({ message }))

export { themeStyle, selectRun, inputRun, select, input }
