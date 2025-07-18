import type { ChalkInstance } from 'chalk'
import chalk from 'chalk'

export type CatppuccinColorTheme = 'latte' | 'frappe' | 'macchiato' | 'mocha'

export type CatppuccinColorName =
    | 'rosewater'
    | 'flamingo'
    | 'pink'
    | 'mauve'
    | 'red'
    | 'maroon'
    | 'peach'
    | 'yellow'
    | 'green'
    | 'teal'
    | 'sky'
    | 'sapphire'
    | 'blue'
    | 'lavender'
    | 'text'
    | 'subtext1'
    | 'subtext0'
    | 'overlay2'
    | 'overlay1'
    | 'overlay0'
    | 'surface2'
    | 'surface1'
    | 'surface0'
    | 'base'
    | 'mantle'
    | 'crust'

const latte: Record<CatppuccinColorName, string> = {
    rosewater: '#DC8A78',
    flamingo: '#DD7878',
    pink: '#EA76CB',
    mauve: '#8839EF',
    red: '#D20F39',
    maroon: '#E64553',
    peach: '#FE640B',
    yellow: '#DF8E1D',
    green: '#40A02B',
    teal: '#179299',
    sky: '#04A5E5',
    sapphire: '#209FB5',
    blue: '#1E66F5',
    lavender: '#7287FD',
    text: '#4C4F69',
    subtext1: '#5C5F77',
    subtext0: '#6C6F85',
    overlay2: '#7C7F93',
    overlay1: '#8C8FA1',
    overlay0: '#9CA0B0',
    surface2: '#ACB0BE',
    surface1: '#BCC0CC',
    surface0: '#CCD0DA',
    base: '#EFF1F5',
    mantle: '#E6E9EF',
    crust: '#DCE0E8',
}

const frappe: Record<CatppuccinColorName, string> = {
    rosewater: '#F2D5CF',
    flamingo: '#EEBEBE',
    pink: '#F4B8E4',
    mauve: '#CA9EE6',
    red: '#E78284',
    maroon: '#EA999C',
    peach: '#EF9F76',
    yellow: '#E5C890',
    green: '#A6D189',
    teal: '#81C8BE',
    sky: '#99D1DB',
    sapphire: '#85C1DC',
    blue: '#8CAAEE',
    lavender: '#BABBF1',
    text: '#C6D0F5',
    subtext1: '#B5BFE2',
    subtext0: '#A5ADCE',
    overlay2: '#949CBB',
    overlay1: '#838BA7',
    overlay0: '#737994',
    surface2: '#626880',
    surface1: '#51576D',
    surface0: '#414559',
    base: '#303446',
    mantle: '#292C3C',
    crust: '#232634',
}

const macchiato: Record<CatppuccinColorName, string> = {
    rosewater: '#F4DBD6',
    flamingo: '#F0C6C6',
    pink: '#F5BDE6',
    mauve: '#C6A0F6',
    red: '#ED8796',
    maroon: '#EE99A0',
    peach: '#F5A97F',
    yellow: '#EED49F',
    green: '#A6DA95',
    teal: '#8BD5CA',
    sky: '#91D7E3',
    sapphire: '#7DC4E4',
    blue: '#8AADF4',
    lavender: '#B7BDF8',
    text: '#CAD3F5',
    subtext1: '#B8C0E0',
    subtext0: '#A5ADCB',
    overlay2: '#939AB7',
    overlay1: '#8087A2',
    overlay0: '#6E738D',
    surface2: '#5B6078',
    surface1: '#494D64',
    surface0: '#363A4F',
    base: '#24273A',
    mantle: '#1E2030',
    crust: '#181926',
}

const mocha: Record<CatppuccinColorName, string> = {
    rosewater: '#F5E0DC',
    flamingo: '#F2CDCD',
    pink: '#F5C2E7',
    mauve: '#CBA6F7',
    red: '#F38BA8',
    maroon: '#EBA0AC',
    peach: '#FAB387',
    yellow: '#F9E2AF',
    green: '#A6E3A1',
    teal: '#94E2D5',
    sky: '#89DCEB',
    sapphire: '#74C7EC',
    blue: '#89B4FA',
    lavender: '#B4BEFE',
    text: '#CDD6F4',
    subtext1: '#BAC2DE',
    subtext0: '#A6ADC8',
    overlay2: '#9399B2',
    overlay1: '#7F849C',
    overlay0: '#6C7086',
    surface2: '#585B70',
    surface1: '#45475A',
    surface0: '#313244',
    base: '#1E1E2E',
    mantle: '#181825',
    crust: '#11111B',
}

const chalkColor = (
    schema: Record<CatppuccinColorName, string>
): Record<CatppuccinColorName, ChalkInstance> => {
    return Object.keys(schema).reduce((obj, it) => {
        const k = it as CatppuccinColorName
        obj[k] = chalk.hex(schema[k])
        return obj
    }, {} as Record<CatppuccinColorName, ChalkInstance>)
}

const catppuccinColorSchema: Record<
    CatppuccinColorTheme,
    Record<CatppuccinColorName, string>
> = {
    latte,
    frappe,
    macchiato,
    mocha,
}

const displayDef: Record<string, CatppuccinColorName> = {
    note: 'sky',
    important: 'pink',
    tip: 'green',
    caution: 'mauve',
    warning: 'peach',
    error: 'red',
}

const displaySchema = (
    cl: Record<CatppuccinColorName, ChalkInstance>
): Record<string, ChalkInstance> => {
    return Object.keys(displayDef).reduce((obj, it) => {
        const k = displayDef[it]
        obj[it] = cl[k]
        return obj
    }, {} as Record<string, ChalkInstance>)
}

const hex = (color: string): ChalkInstance => chalk.hex(color)

export { catppuccinColorSchema, displaySchema, chalkColor, hex }
