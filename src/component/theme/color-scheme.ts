/**
 * [INPUT]: 依赖内置主题色板、Chalk 与 Commander help 样式契约
 * [OUTPUT]: colorScheme 主题解析器、commanderHelpConfiguration 与 schemes 清单
 * [POS]: src/component/theme/ 的唯一主题装配入口，把静态色值转换为终端渲染能力
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { HelpConfiguration } from '@commander-js/extra-typings'
import type { ChalkInstance } from 'chalk'
import chalk from 'chalk'
import { colorScheme as catppuccin } from './catppuccin'
import { colorScheme as rosePine } from './rose-pine'
import type { ColorScheme, TerminalColorName, ThemeScheme } from './theme-type'
import { colorScheme as tokyoNight } from './tokyo-night'

const schemes = [...rosePine, ...catppuccin, ...tokyoNight]

const hex = (color: string): ChalkInstance => {
    return chalk.hex(color)
}

const defaultColor: ColorScheme = tokyoNight[0]

const toChalk = (color: Record<TerminalColorName, string>) => {
    return Object.entries(color).reduce(
        (acc, [k, v]) => {
            acc[k as TerminalColorName] = hex(v)
            return acc
        },
        {} as Record<TerminalColorName, ChalkInstance>,
    )
}

const colorScheme = (schema: string): ThemeScheme => {
    const c = schemes.find((it) => it.name === schema)
    if (c) {
        return {
            ...c,
            chalkColor: toChalk(c.color),
        }
    }
    return {
        ...defaultColor,
        chalkColor: toChalk(defaultColor.color),
    }
}

const commanderHelpConfiguration = (
    color: Record<TerminalColorName, string>,
): HelpConfiguration => {
    const { red, yellow, green, blue, magenta, cyan } = color
    return {
        styleTitle: (str) => hex(red).bold(str),
        styleCommandText: (str) => hex(cyan)(str),
        styleCommandDescription: (str) => hex(green).bold.italic(str),
        styleDescriptionText: (str) => hex(yellow).italic(str),
        styleOptionText: (str) => hex(green)(str),
        styleArgumentText: (str) => hex(red)(str),
        styleSubcommandText: (str) => hex(blue).italic(str),
        styleOptionTerm: (str) => hex(magenta).italic(str),
    } as HelpConfiguration
}

export { colorScheme, commanderHelpConfiguration, schemes }
