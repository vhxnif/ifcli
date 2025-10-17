import type { ChalkInstance } from 'chalk'
import { colorSchema as rosePine } from './rose-pine'
import chalk from 'chalk'
import type {
    ChalkChatBoxColor,
    ChalkChatBoxTheme,
    ChalkColor,
    ChalkTerminalColor,
    ChatBoxColor,
    ChatBoxContentType,
    ChatBoxPart,
    ChatBoxTheme,
    ColorSchema,
    TerminalColorName,
} from './theme-type'
import type { HelpConfiguration } from '@commander-js/extra-typings'

const schemas = [...rosePine]

const hex = (color: string): ChalkInstance => {
    return chalk.hex(color)
}

const defaultColor: ColorSchema = rosePine[0]

const colorSchema = (schema: string): ColorSchema => {
    const c = schemas.find((it) => it.name === schema)
    if (c) {
        return c
    }
    return defaultColor
}

const chalkTerminalColor = (
    color: Record<TerminalColorName, string>
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
    const { color, theme } = colorSchema(schema)
    return [chalkTerminalColor(color), chalkChatBoxTheme(theme)]
}

const commanderHelpConfiguration = (
    color: ChalkTerminalColor
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

export { schemas, chalkColor, hex, commanderHelpConfiguration }
