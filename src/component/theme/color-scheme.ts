import type { HelpConfiguration } from '@commander-js/extra-typings'
import type { ChalkInstance } from 'chalk'
import chalk from 'chalk'
import { colorScheme as catppuccin } from './catppuccin'
import { colorScheme as rosePine } from './rose-pine'
import type {
    ChalkChatBoxColor,
    ChalkChatBoxTheme,
    ChalkColor,
    ChalkTerminalColor,
    ChatBoxColor,
    ChatBoxContentType,
    ChatBoxPart,
    ChatBoxTheme,
    ColorScheme,
    SpinnerName,
    TerminalColorName,
    ThemeSemanticColors,
} from './theme-type'
import { colorScheme as tokyoNight } from './tokyo-night'

const schemes = [...rosePine, ...catppuccin, ...tokyoNight]

const hex = (color: string): ChalkInstance => {
    return chalk.hex(color)
}

const defaultColor: ColorScheme = tokyoNight[0]

const colorScheme = (schema: string): ColorScheme => {
    const c = schemes.find((it) => it.name === schema)
    if (c) {
        return c
    }
    return defaultColor
}

const chalkTerminalColor = (
    color: Record<TerminalColorName, string>,
): ChalkTerminalColor => {
    return Object.entries(color).reduce((obj, it) => {
        const [key, value] = it
        obj[key as TerminalColorName] = hex(value)
        return obj
    }, {} as ChalkTerminalColor)
}

const chalkChatBoxTheme = (theme: ChatBoxTheme): ChalkChatBoxTheme => {
    const f = (c: ChatBoxColor) => {
        return Object.entries(c).reduce((obj, it) => {
            const [key, value] = it
            obj[key as ChatBoxPart] = hex(value)
            return obj
        }, {} as ChalkChatBoxColor)
    }
    return Object.entries(theme).reduce((obj, it) => {
        const [key, value] = it
        obj[key as ChatBoxContentType] = f(value)
        return obj
    }, {} as ChalkChatBoxTheme)
}

const chalkColor = (schema: string): ChalkColor => {
    const { color, theme } = colorScheme(schema)
    return [chalkTerminalColor(color), chalkChatBoxTheme(theme)]
}

const getSemanticColors = (schema: string): ThemeSemanticColors => {
    const c = colorScheme(schema)
    return c.semantic ?? defaultColor.semantic!
}

const defaultSpinner: SpinnerName = 'helix'

const getSpinnerName = (schema: string): SpinnerName => {
    const c = colorScheme(schema)
    return c.spinner ?? defaultSpinner
}

const commanderHelpConfiguration = (
    color: ChalkTerminalColor,
): HelpConfiguration => {
    const { red, yellow, green, blue, magenta, cyan } = color
    return {
        styleTitle: (str) => red.bold(str),
        styleCommandText: (str) => cyan(str),
        styleCommandDescription: (str) => green.bold.italic(str),
        styleDescriptionText: (str) => yellow.italic(str),
        styleOptionText: (str) => green(str),
        styleArgumentText: (str) => red(str),
        styleSubcommandText: (str) => blue.italic(str),
        styleOptionTerm: (str) => magenta.italic(str),
    } as HelpConfiguration
}

export {
    chalkColor,
    commanderHelpConfiguration,
    getSemanticColors,
    getSpinnerName,
    hex,
    schemes,
}
