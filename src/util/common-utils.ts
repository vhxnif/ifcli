
import moment from "moment"
import chalk, { type ChalkInstance } from 'chalk';

const hex = (color: string): ChalkInstance => chalk.hex(color)
const rosewater = hex('#F5E0DC')
const flamingo = hex('#F2CDCD')
const pink = hex('#F5C2E7')
const mauve = hex('#CBA6F7')
const red = hex('#F38BA8')
const maroon = hex('#EBA0AC')
const peach = hex('#FAB387')
const yellow = hex('#F9E2AF')
const green = hex('#A6E3A1')
const teal = hex('#94E2D5')
const sky = hex('#89DCEB')
const sapphire = hex('#74C7EC')
const blue = hex('#89B4FA')
const lavender = hex('#B4BEFE')
const text = hex('#CDD6F4')
const subtext1 = hex('#BAC2DE')
const subtext0 = hex('#A6ADC8')
const overlay2 = hex('#9399B2')
const overlay1 = hex('#7F849C')
const overlay0 = hex('#6C7086')
const surface2 = hex('#585B70')
const surface1 = hex('#45475A')
const surface0 = hex('#313244')
const base = hex('#1E1E2E')
const mantle = hex('#181825')
const crust = hex('#11111B')


const error = maroon
const sourceText = peach

const bold = chalk.bold
const underline = chalk.underline
const italic = chalk.italic

const print = (str: string) => process.stdout.write(str)
const println = console.log
const getEnv = (key: string): string | undefined => process.env[`${key}`]
const unixnow = (): number => moment().unix()
const containsChinese = (str: string) : boolean => {
    return /[\u4e00-\u9fa5]/.test(str);
}

const output = (str: string, opt: string[] = [], text: ChalkInstance) : void => {
    const keyword = ['Usage:', 'Options:', 'Commands:']
    const args = ['[options]', '[command]']
    const opts = [...opt, '<string>']
    let rStr = str
    const rp = (s: string, color: ChalkInstance) : void => { rStr = rStr.replaceAll(s, color(s))}
    keyword.forEach(it => rp(it, yellow))
    args.forEach(it => rp(it, pink))
    opts.forEach(it => rp(it, green))
    println(text(rStr))
}

export {
    getEnv,
    unixnow,
    print,
    println,
    containsChinese,
    output,
    error,
    text,
    sourceText,
    bold,
    underline,
    italic,
    rosewater,
    flamingo,
    pink,
    mauve,
    red,
    maroon,
    peach,
    yellow,
    green,
    teal,
    blue,
    sky,
    sapphire,
    lavender,
    crust,
    mantle,
    subtext0,
}