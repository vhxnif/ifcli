import type { ChalkInstance } from 'chalk'
import type { Color } from 'ora'

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

export type ChatBoxPart = 'title' | 'bolder' | 'content'

export type ChatBoxColor = Record<ChatBoxPart, string>

export type ChalkChatBoxColor = Record<ChatBoxPart, ChalkInstance>

export type SemanticColorType =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'
    | 'toolCalling'

export type ThemeSemanticColors = Record<SemanticColorType, Color>

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
    semantic?: ThemeSemanticColors
    spinner?: SpinnerName
}

export type ThemeScheme = ColorScheme & {
    chalkColor: Record<TerminalColorName, ChalkInstance>
}
