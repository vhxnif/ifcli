import type { ChalkTerminalColor } from '../component/theme/theme-type'

export const symbols = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    loading: '●',
    bullet: '•',
    arrow: '➜',
    question: '?',
} as const

export const statusFormat = {
    success: (color: ChalkTerminalColor) => color.green.bold(symbols.success),
    error: (color: ChalkTerminalColor) => color.red.bold(symbols.error),
    warning: (color: ChalkTerminalColor) => color.yellow.bold(symbols.warning),
    info: (color: ChalkTerminalColor) => color.cyan.bold(symbols.info),
    loading: (color: ChalkTerminalColor) => color.blue.bold(symbols.loading),
}

export const treeChars = {
    top: '┌',
    middle: '├',
    bottom: '└',
    line: '│',
} as const
