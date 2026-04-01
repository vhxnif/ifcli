export type BorderStyle = 'rounded' | 'sharp' | 'double' | 'single' | 'none'

export type BorderChars = {
    tl: string
    tr: string
    bl: string
    br: string
    h: string
    v: string
}

export const BorderStyles: Record<BorderStyle, BorderChars> = {
    rounded: {
        tl: '╭',
        tr: '╮',
        bl: '╰',
        br: '╯',
        h: '─',
        v: '│',
    },
    sharp: {
        tl: '┌',
        tr: '┐',
        bl: '└',
        br: '┘',
        h: '─',
        v: '│',
    },
    double: {
        tl: '╔',
        tr: '╗',
        bl: '╚',
        br: '╝',
        h: '═',
        v: '║',
    },
    single: {
        tl: '┌',
        tr: '┐',
        bl: '└',
        br: '┘',
        h: '─',
        v: '│',
    },
    none: {
        tl: '',
        tr: '',
        bl: '',
        br: '',
        h: '',
        v: '',
    },
}