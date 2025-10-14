import input from '@inquirer/input'
import select from '@inquirer/select'
import checkbox from '@inquirer/checkbox'
import type { CatppuccinColorName } from './color-schema'
import type { ChalkInstance } from 'chalk'

export type Choice<V> = {
    name: string
    value: V
    description?: string
    disabled?: boolean | string
}

async function selectRun<V>(
    message: string,
    choices: Choice<V>[],
    f: (str: V) => void
): Promise<void> {
    const v = await select({ message, choices })
    f(v)
}

type ThemeStyle = {
    style: {
        disabled: (str: string) => string
        description: (str: string) => string
    }
}

function themeStyle(
    ds: Record<CatppuccinColorName, ChalkInstance>
): ThemeStyle {
    return {
        style: {
            disabled: (text: string) => `- ${ds.yellow(text)}`,
            description: (text: string) => ds.mauve(text),
        },
    }
}

async function inputRun(
    message: string,
    f: (str: string) => void
): Promise<void> {
    f(await input({ message }))
}

export { type ThemeStyle, themeStyle, selectRun, inputRun, select, input, checkbox }
