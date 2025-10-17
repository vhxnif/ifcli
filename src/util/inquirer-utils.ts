import input from '@inquirer/input'
import select from '@inquirer/select'
import checkbox from '@inquirer/checkbox'
import type { ChalkTerminalColor } from '../component/theme/theme-type'

export type Choice<V> = {
    name: string
    value: V
    description?: string
    disabled?: boolean | string
}

const selectRun = async <V,>(
    message: string,
    choices: Choice<V>[],
    f: (str: V) => void
): Promise<void> => {
    const v = await select({ message, choices })
    f(v)
}

type ThemeStyle = {
    style: {
        disabled: (str: string) => string
        description: (str: string) => string
    }
}

const themeStyle = (color: ChalkTerminalColor): ThemeStyle => {
    const { yellow, magenta } = color
    return {
        style: {
            disabled: (text: string) => `- ${yellow(text)}`,
            description: (text: string) => magenta(text),
        },
    }
}

const inputRun = async (
    message: string,
    f: (str: string) => void
): Promise<void> => {
    f(await input({ message }))
}

export {
    type ThemeStyle,
    themeStyle,
    selectRun,
    inputRun,
    select,
    input,
    checkbox,
}
