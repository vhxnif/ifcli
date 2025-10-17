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

export type ColorSchema = {
    name: string
    color: Record<TerminalColorName, string>
    theme: ChatBoxTheme
}

export type ChalkColor = [
    terminalColor: ChalkTerminalColor,
    chatBoxTheme: ChalkChatBoxTheme
]
