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

export type ChatBoxContentType = 'reasoner' | 'tools' | 'assisant'

export type ChatBoxTheme = Record<ChatBoxContentType, ChatBoxColor>
export type ChalkChatBoxTheme = Record<ChatBoxContentType, ChalkChatBoxColor>

export type SemanticColorType =
    | 'waiting'
    | 'analyzing'
    | 'thinking'
    | 'rendering'
    | 'error'
    | 'completed'

export type ThemeSemanticColors = Record<SemanticColorType, TerminalColorName>

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
    theme: ChatBoxTheme
    semantic?: ThemeSemanticColors
    spinner?: SpinnerName
}

export type ChalkColor = [
    terminalColor: ChalkTerminalColor,
    chatBoxTheme: ChalkChatBoxTheme,
]
