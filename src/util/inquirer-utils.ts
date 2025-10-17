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

const prefix = (color: ChalkTerminalColor) => {
    const { yellow, green } = color
    return {
        idle: yellow('?'),
        done: green('✓'),
    }
}

const style = (color: ChalkTerminalColor) => {
    const { magenta, green, cyan, red, blue } = color
    return {
        answer: (text: string) => green.italic(text),
        message: (text: string) => cyan.bold(text),
        error: (text: string) => red(text),
        help: (text: string) => blue.italic.dim(text),
        highlight: (text: string) => cyan.italic(text),
        description: (text: string) => magenta(text),
    }
}

const cursor = (color: ChalkTerminalColor) => {
    return color.green('➜')
}

type SelectThemeStyle = {
    prefix: { idle: string; done: string }
    style: {
        answer: (str: string) => string
        message: (str: string) => string
        error: (str: string) => string
        help: (str: string) => string
        highlight: (str: string) => string
        disabled: (str: string) => string
        description: (str: string) => string
    }
    icon: {
        cursor: string
    }
}

const selectThemeStyle = (color: ChalkTerminalColor): SelectThemeStyle => {
    const { yellow } = color
    return {
        prefix: prefix(color),
        style: {
            ...style(color),
            disabled: (text: string) => `- ${yellow(text)}`,
        },
        icon: {
            cursor: cursor(color),
        },
    }
}

type CheckBoxThemeStyle = {
    prefix: { idle: string; done: string }
    style: {
        answer: (str: string) => string
        message: (str: string) => string
        error: (str: string) => string
        help: (str: string) => string
        highlight: (str: string) => string
        key: (text: string) => string
        description: (str: string) => string
    }
    icon: {
        checked: string
        unchecked: string
        cursor: string
    }
}

const checkboxThemeStyle = (color: ChalkTerminalColor): CheckBoxThemeStyle => {
    const { yellow, green } = color
    return {
        prefix: prefix(color),
        style: {
            ...style(color),
            key: (text: string) => `<${yellow.italic(text)}>`,
        },
        icon: {
            cursor: ' ',
            unchecked: '◯',
            checked: green('◉'),
        },
    }
}

export { selectThemeStyle, checkboxThemeStyle, select, input, checkbox }
