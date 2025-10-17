import type { ChatBoxTheme, ColorSchema, TerminalColorName } from './theme-type'

type ColorName =
    | 'base'
    | 'surface'
    | 'overlay'
    | 'muted'
    | 'subtle'
    | 'text'
    | 'love'
    | 'gold'
    | 'rose'
    | 'pine'
    | 'foam'
    | 'iris'
    | 'highlightLow'
    | 'highlightMed'
    | 'highlightHigh'
type Color = Record<ColorName, string>
type RosePineType = 'Rose Pine' | 'Rose Pine Moon' | 'Rose Pine Dawn'

const schema: Record<RosePineType, Color> = {
    'Rose Pine': {
        base: '#191724',
        surface: '#1f1d2e',
        overlay: '#26233a',
        muted: '#6e6a86',
        subtle: '#908caa',
        text: '#e0def4',
        love: '#eb6f92',
        gold: '#f6c177',
        rose: '#ebbcba',
        pine: '#31748f',
        foam: '#9ccfd8',
        iris: '#c4a7e7',
        highlightLow: '#21202e',
        highlightMed: '#403d52',
        highlightHigh: '#524f67',
    },
    'Rose Pine Moon': {
        base: '#232136',
        surface: '#2a273f',
        overlay: '#393552',
        muted: '#6e6a86',
        subtle: '#908caa',
        text: '#e0def4',
        love: '#eb6f92',
        gold: '#f6c177',
        rose: '#ea9a97',
        pine: '#3e8fb0',
        foam: '#9ccfd8',
        iris: '#c4a7e7',
        highlightLow: '#2a283e',
        highlightMed: '#44415a',
        highlightHigh: '#56526e',
    },
    'Rose Pine Dawn': {
        base: '#faf4ed',
        surface: '#fffaf3',
        overlay: '#f2e9e1',
        muted: '#9893a5',
        subtle: '#797593',
        text: '#575279',
        love: '#b4637a',
        gold: '#ea9d34',
        rose: '#d7827e',
        pine: '#286983',
        foam: '#56949f',
        iris: '#907aa9',
        highlightLow: '#f4ede8',
        highlightMed: '#dfdad9',
        highlightHigh: '#cecacd',
    },
}

const generateTheme = (s: Color): ChatBoxTheme => {
    const { pine, gold, love, highlightMed, subtle, muted, text } = s
    return {
        reasoner: {
            title: pine,
            bolder: highlightMed,
            content: subtle,
        },
        tools: {
            title: gold,
            bolder: highlightMed,
            content: muted,
        },
        assisant: {
            title: love,
            bolder: love,
            content: text,
        },
    }
}

const generateTerminalColor = (s: Color): Record<TerminalColorName, string> => {
    const { base, text, love, pine, foam, iris, rose, gold, muted } = s
    return {
        black: base,
        red: love,
        green: pine,
        yellow: gold,
        blue: foam,
        magenta: iris,
        cyan: rose,
        white: text,
        blackBright: muted,
        redBright: love,
        greenBright: pine,
        yellowBright: gold,
        blueBright: foam,
        magentaBright: iris,
        cyanBright: rose,
        whiteBright: base,
    }
}

const rosePine = schema['Rose Pine']
const rosePineMoon = schema['Rose Pine Moon']
const rosePineDawn = schema['Rose Pine Dawn']

const colorSchema: ColorSchema[] = [
    {
        name: 'Rose Pine',
        color: generateTerminalColor(rosePine),
        theme: generateTheme(rosePine),
    },
    {
        name: 'Rose Pine Moon',
        color: {
            ...generateTerminalColor(rosePineMoon),
        },
        theme: generateTheme(rosePineMoon),
    },
    {
        name: 'Rose Pine Dawn',
        color: {
            ...generateTerminalColor(rosePineDawn),
            black: rosePineDawn.text,
            white: rosePineDawn.base,
        },
        theme: generateTheme(rosePineDawn),
    },
]

export { colorSchema }
