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
    const { magenta, green, cyan, red, blue, yellow } = color
    return {
        answer: (text: string) => green.italic(text),
        message: (text: string, status: 'idle' | 'done' | 'loading') => {
            switch (status) {
                case 'idle':
                    return cyan.bold(text)
                case 'done':
                    return magenta.bold(text)
                case 'loading':
                    return blue.bold(text)
            }
        },
        error: (text: string) => red(text),
        help: (text: string) => blue.italic.dim(text),
        highlight: (text: string) => cyan.italic(text),
        description: (text: string) => magenta(text),
        key: (text: string) => `<${yellow.italic(text)}>`,
        disabled: (text: string) => `- ${yellow(text)}`,
    }
}

const cursor = (color: ChalkTerminalColor) => {
    return color.green('➜')
}

type SelectThemeStyle = {
    prefix: { idle: string; done: string }
    style: {
        answer: (str: string) => string
        message: (text: string, status: 'idle' | 'done' | 'loading') => string
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
    const { answer, message, error, help, highlight, disabled, description } =
        style(color)
    return {
        prefix: prefix(color),
        style: {
            answer,
            message,
            error,
            help,
            highlight,
            disabled,
            description,
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
        message: (text: string, status: 'idle' | 'done' | 'loading') => string
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
    const { answer, message, error, help, highlight, key, description } =
        style(color)
    return {
        prefix: prefix(color),
        style: {
            answer,
            message,
            error,
            help,
            highlight,
            key,
            description,
        },
        icon: {
            cursor: ' ',
            unchecked: '◯',
            checked: color.green('◉'),
        },
    }
}

type InputThemeStyle = {
    prefix: string | { idle: string; done: string }
    style: {
        answer: (text: string) => string
        message: (text: string, status: 'idle' | 'done' | 'loading') => string
        error: (text: string) => string
    }
}

const inputThemeStyle = (color: ChalkTerminalColor): InputThemeStyle => {
    const { answer, message, error } = style(color)
    return {
        prefix: prefix(color),
        style: {
            answer,
            message,
            error,
        },
    }
}

export {
    selectThemeStyle,
    checkboxThemeStyle,
    inputThemeStyle,
    select,
    checkbox,
    input,
}
