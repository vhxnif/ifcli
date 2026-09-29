/**
 * [INPUT]: 依赖 ChalkInstance 描述运行时颜色函数
 * [OUTPUT]: TerminalColorName/ColorScheme/ThemeScheme/SpinnerName 等主题边界类型
 * [POS]: src/component/theme/ 的类型契约，约束全部静态色板与渲染消费者
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { ChalkInstance } from 'chalk'

export type TerminalColorName =
    | 'black'
    | 'red'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'cyan'
    | 'white'
    | 'gray'
    | 'blackBright'
    | 'redBright'
    | 'greenBright'
    | 'yellowBright'
    | 'blueBright'
    | 'magentaBright'
    | 'cyanBright'
    | 'whiteBright'

export type TerminalColor = Record<TerminalColorName, string>

export type ChalkTerminalColor = Record<TerminalColorName, ChalkInstance>

export type SpinnerName =
    | 'braille'
    | 'braillewave'
    | 'dna'
    | 'scan'
    | 'rain'
    | 'scanline'
    | 'pulse'
    | 'snake'
    | 'sparkle'
    | 'cascade'
    | 'columns'
    | 'orbit'
    | 'breathe'
    | 'waverows'
    | 'checkerboard'
    | 'helix'
    | 'fillsweep'
    | 'diagswipe'

export type ColorScheme = {
    name: string
    color: Record<TerminalColorName, string>
    spinner?: SpinnerName
}

export type ThemeScheme = ColorScheme & {
    chalkColor: Record<TerminalColorName, ChalkInstance>
}
