import type { ChalkTerminalColor } from '../component/theme/theme-type'
import { promptMessage } from '../config/prompt-message'
import { symbols, treeChars } from './ui-symbols'

export type MessageType = 'error' | 'warning' | 'info' | 'success'
export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'ready'

export const statusFormat = {
    success: (color: ChalkTerminalColor) => color.green.bold(symbols.success),
    error: (color: ChalkTerminalColor) => color.red.bold(symbols.error),
    warning: (color: ChalkTerminalColor) => color.yellow.bold(symbols.warning),
    info: (color: ChalkTerminalColor) => color.cyan.bold(symbols.info),
    loading: (color: ChalkTerminalColor) => color.blue.bold(symbols.loading),
}

export const format = {
    status: (
        type: StatusType,
        text: string,
        color: ChalkTerminalColor,
    ): string => {
        const formatMap: Record<StatusType, () => string> = {
            success: () =>
                `${statusFormat.success(color)} ${color.white.bold(text)}`,
            error: () => `${statusFormat.error(color)} ${color.red(text)}`,
            warning: () =>
                `${statusFormat.warning(color)} ${color.yellow(text)}`,
            info: () => `${statusFormat.info(color)} ${color.white(text)}`,
            ready: () =>
                `${statusFormat.loading(color)} ${color.white.bold(text)}`,
        }
        return formatMap[type]()
    },

    keyValue: (
        key: string,
        value: string,
        color: ChalkTerminalColor,
    ): string => {
        return `${color.cyan.bold(key)}: ${color.white(value)}`
    },

    list: (items: string[], color: ChalkTerminalColor): string => {
        return items
            .map((item, index) => {
                const prefix =
                    index === 0
                        ? treeChars.top
                        : index === items.length - 1
                          ? treeChars.bottom
                          : treeChars.middle
                return ` ${color.cyan(prefix)} ${color.white(item)}`
            })
            .join('\n')
    },

    divider: (color: ChalkTerminalColor, length: number = 30): string => {
        return color.cyan('─'.repeat(length))
    },

    prompt: (text: string, color: ChalkTerminalColor): string => {
        return `${color.cyan(symbols.question)} ${color.white.bold(text)}`
    },

    label: (
        label: string,
        value: string,
        color: ChalkTerminalColor,
    ): string => {
        return `${color.cyan.bold(label)}: ${color.white(value)}`
    },

    hint: (text: string, color: ChalkTerminalColor): string => {
        return `${color.yellow(`${symbols.info} Hint:`)}${color.yellow.dim(` ${text}`)}`
    },
}

export const styledMessage = (
    type: MessageType,
    key: keyof typeof promptMessage,
    color: ChalkTerminalColor,
): string => {
    const message = promptMessage[key]
    const { red, yellow, cyan, green, white } = color

    const prefixes: Record<MessageType, string> = {
        error: red.bold(`${symbols.error} Error:`),
        warning: yellow.bold(`${symbols.warning} Warning:`),
        info: cyan.bold(`${symbols.info} Info:`),
        success: green.bold(`${symbols.success} Success:`),
    }

    const formattedMessage =
        type === 'error'
            ? red(message)
            : type === 'warning'
              ? yellow(message)
              : white(message)

    return `${prefixes[type]} ${formattedMessage}`
}

export const styledList = format.list
export const styledDivider = format.divider
export const styledPrompt = format.prompt
export const styledLabel = format.label
