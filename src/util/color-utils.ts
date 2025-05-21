import chalk, { type ChalkInstance } from 'chalk'

const hex = (color: string): ChalkInstance => chalk.hex(color)

const color = {
    rosewater: hex('#F5E0DC'),
    flamingo: hex('#F2CDCD'),
    pink: hex('#F5C2E7'),
    mauve: hex('#CBA6F7'),
    red: hex('#F38BA8'),
    maroon: hex('#EBA0AC'),
    peach: hex('#FAB387'),
    yellow: hex('#F9E2AF'),
    green: hex('#A6E3A1'),
    teal: hex('#94E2D5'),
    sky: hex('#89DCEB'),
    sapphire: hex('#74C7EC'),
    blue: hex('#89B4FA'),
    lavender: hex('#B4BEFE'),
    subtext1: hex('#BAC2DE'),
    subtext0: hex('#A6ADC8'),
    overlay2: hex('#9399B2'),
    overlay1: hex('#7F849C'),
    overlay0: hex('#6C7086'),
    surface2: hex('#585B70'),
    surface1: hex('#45475A'),
    surface0: hex('#313244'),
    base: hex('#1E1E2E'),
    mantle: hex('#181825'),
    crust: hex('#11111B'),
}

// ---- display ---- //
const display = {
    note: color.sky,
    important: color.pink,
    tip: color.green,
    caution: color.mauve,
    warning: color.peach,
    error: color.red,
}

const style = {
    bold: chalk.bold,
    underline: chalk.underline,
    italic: chalk.italic,
}

const wrapAnsi = (c: ChalkInstance, str: string, width: number) => {
    const f = (arr: string[], s: string) => {
        let tmp: number = 0
        let idx = s.length - 1
        for (let i = 0; i < s.length; i++) {
            tmp += Bun.stringWidth(s[i])
            if (tmp >= width) {
                idx = i
                break
            }
        }
        const ns = s.slice(0, idx + 1)
        arr.push(ns)
        if (idx < s.length - 1) {
            f(arr, s.slice(idx + 1))
        }
    }
    const strArr: string[] = []
    f(strArr, str)
    return strArr.map((it) => c(it)).join('\n')
}
export { color, style, display, wrapAnsi, hex }
