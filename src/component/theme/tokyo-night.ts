import type { ChatBoxTheme, ColorScheme, TerminalColorName } from './theme-type'

//  https://github.com/folke/tokyonight.nvim/tree/main/extras/helix
type TokyoNightType =
    | 'Tokyo Night'
    | 'Tokyo Night Day'
    | 'Tokyo Night Moon'
    | 'Tokyo Night Storm'

type ColorName = TerminalColorName | 'orange' | 'purple' | 'teal' | 'comment'
type Color = Record<ColorName, string>

const scheme: Record<TokyoNightType, Color> = {
    'Tokyo Night': {
        black: '#15161e',
        blackBright: '#414868',
        blue: '#7aa2f7',
        blueBright: '#8db0ff',
        cyan: '#7dcfff',
        cyanBright: '#a4daff',
        green: '#9ece6a',
        greenBright: '#9fe044',
        magenta: '#bb9af7',
        magentaBright: '#c7a9ff',
        red: '#f7768e',
        redBright: '#ff899d',
        white: '#a9b1d6',
        whiteBright: '#c0caf5',
        yellow: '#e0af68',
        yellowBright: '#faba4a',
        orange: '#ff9e64',
        purple: '#9d7cd8',
        teal: '#1abc9c',
        comment: '#565f89',
    },
    'Tokyo Night Day': {
        black: '#b4b5b9',
        blackBright: '#a1a6c5',
        blue: '#2e7de9',
        blueBright: '#358aff',
        cyan: '#007197',
        cyanBright: '#007ea8',
        green: '#587539',
        greenBright: '#5c8524',
        magenta: '#9854f1',
        magentaBright: '#a463ff',
        red: '#f52a65',
        redBright: '#ff4774',
        white: '#6172b0',
        whiteBright: '#3760bf',
        yellow: '#8c6c3e',
        yellowBright: '#a27629',
        orange: '#b15c00',
        purple: '#7847bd',
        teal: '#118c74',
        comment: '#848cb5',
    },
    'Tokyo Night Moon': {
        black: '#1b1d2b',
        blackBright: '#444a73',
        blue: '#82aaff',
        blueBright: '#9ab8ff',
        cyan: '#86e1fc',
        cyanBright: '#b2ebff',
        green: '#c3e88d',
        greenBright: '#c7fb6d',
        magenta: '#c099ff',
        magentaBright: '#caabff',
        red: '#ff757f',
        redBright: '#ff8d94',
        white: '#828bb8',
        whiteBright: '#c8d3f5',
        yellow: '#ffc777',
        yellowBright: '#ffd8ab',
        orange: '#ff966c',
        purple: '#fca7ea',
        teal: '#4fd6be',
        comment: '#636da6',
    },
    'Tokyo Night Storm': {
        black: '#1d202f',
        blackBright: '#414868',
        blue: '#7aa2f7',
        blueBright: '#8db0ff',
        cyan: '#7dcfff',
        cyanBright: '#a4daff',
        green: '#9ece6a',
        greenBright: '#9fe044',
        magenta: '#bb9af7',
        magentaBright: '#c7a9ff',
        red: '#f7768e',
        redBright: '#ff899d',
        white: '#a9b1d6',
        whiteBright: '#c0caf5',
        yellow: '#e0af68',
        yellowBright: '#faba4a',
        orange: '#ff9e64',
        purple: '#9d7cd8',
        teal: '#1abc9c',
        comment: '#565f89',
    },
}

const generateTerminalColor = (s: Color): Record<TerminalColorName, string> => {
    return {
        ...s,
    }
}

const generateTheme = (s: Color): ChatBoxTheme => {
    const { blue, orange, purple, comment, whiteBright, blackBright } = s
    return {
        reasoner: {
            title: blue,
            bolder: blackBright,
            content: comment,
        },
        tools: {
            title: orange,
            bolder: blackBright,
            content: comment,
        },
        assisant: {
            title: purple,
            bolder: purple,
            content: whiteBright,
        },
    }
}

const tokyoNight = scheme['Tokyo Night']
const tokyoNightDay = scheme['Tokyo Night Day']
const tokyoNightMoon = scheme['Tokyo Night Moon']
const tokyoNightStorm = scheme['Tokyo Night Storm']

const colorScheme: ColorScheme[] = [
    {
        name: 'Tokyo Night',
        color: generateTerminalColor(tokyoNight),
        theme: generateTheme(tokyoNight),
    },
    {
        name: 'Tokyo Night Day',
        color: generateTerminalColor(tokyoNightDay),
        theme: generateTheme(tokyoNightDay),
    },
    {
        name: 'Tokyo Night Moon',
        color: generateTerminalColor(tokyoNightMoon),
        theme: generateTheme(tokyoNightMoon),
    },
    {
        name: 'Tokyo Night Storm',
        color: generateTerminalColor(tokyoNightStorm),
        theme: generateTheme(tokyoNightStorm),
    },
]

export { colorScheme }
