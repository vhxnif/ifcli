import type { HelpConfiguration } from '@commander-js/extra-typings'
import type { ChalkInstance } from 'chalk'
import chalk from 'chalk'
import { colorScheme as catppuccin } from './catppuccin'
import { colorScheme as rosePine } from './rose-pine'
import type {
    ColorScheme,
    SpinnerName,
    TerminalColorName,
    ThemeScheme,
    ThemeSemanticColors,
} from './theme-type'
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

export {
    colorScheme,
    commanderHelpConfiguration,
    getSemanticColors,
    getSpinnerName,
    hex,
    schemes,
}
