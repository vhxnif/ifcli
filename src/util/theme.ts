import type { CatppuccinColorName, CatppuccinColorTheme } from './color-schema'

export type ThemeColor = {
    titleColor: CatppuccinColorName
    bolderColor: CatppuccinColorName
    textColor: CatppuccinColorName
}

export type Theme = {
    palette: CatppuccinColorTheme
    reasoning: ThemeColor
    assistant: ThemeColor
    toolsCall: ThemeColor
}

export const themes: Record<string, Theme> = {
    midnight_sonata: {
        // 午夜奏鸣曲
        palette: 'mocha', // 暗色主题
        reasoning: {
            titleColor: 'lavender',
            bolderColor: 'overlay0',
            textColor: 'teal',
        },
        assistant: {
            titleColor: 'mauve',
            bolderColor: 'overlay1',
            textColor: 'pink',
        },
        toolsCall: {
            titleColor: 'sapphire',
            bolderColor: 'overlay2',
            textColor: 'green',
        },
    },

    sunlit_verse: {
        // 日光诗篇
        palette: 'latte', // 亮色主题
        reasoning: {
            titleColor: 'yellow',
            bolderColor: 'rosewater',
            textColor: 'text',
        },
        assistant: {
            titleColor: 'peach',
            bolderColor: 'flamingo',
            textColor: 'subtext0',
        },
        toolsCall: {
            titleColor: 'green',
            bolderColor: 'teal',
            textColor: 'blue',
        },
    },

    frosted_lullaby: {
        // 冰霜摇篮曲
        palette: 'frappe', // 暗色主题 (色调比Mocha柔和)
        reasoning: {
            titleColor: 'sapphire',
            bolderColor: 'overlay0',
            textColor: 'lavender',
        },
        assistant: {
            titleColor: 'pink',
            bolderColor: 'flamingo',
            textColor: 'mauve',
        },
        toolsCall: {
            titleColor: 'teal',
            bolderColor: 'overlay1',
            textColor: 'green',
        },
    },

    twilight_sigil: {
        // 暮色印记
        palette: 'macchiato', // 暗色主题 (色调比Frappe稍浓郁)
        reasoning: {
            titleColor: 'lavender',
            bolderColor: 'overlay0',
            textColor: 'rosewater',
        },
        assistant: {
            titleColor: 'mauve',
            bolderColor: 'overlay2',
            textColor: 'pink',
        },
        toolsCall: {
            titleColor: 'green',
            bolderColor: 'sapphire',
            textColor: 'yellow',
        },
    },

    aurora_hymn: {
        // 极光赞歌
        palette: 'mocha',
        reasoning: {
            titleColor: 'teal',
            bolderColor: 'overlay0',
            textColor: 'green',
        },
        assistant: {
            titleColor: 'rosewater',
            bolderColor: 'maroon',
            textColor: 'peach',
        },
        toolsCall: {
            titleColor: 'green',
            bolderColor: 'peach',
            textColor: 'yellow',
        },
    },

    candlelit_echo: {
        //烛光回响
        palette: 'latte',
        reasoning: {
            titleColor: 'peach',
            bolderColor: 'yellow',
            textColor: 'text',
        },
        assistant: {
            titleColor: 'rosewater',
            bolderColor: 'maroon',
            textColor: 'mauve',
        },
        toolsCall: {
            titleColor: 'mauve',
            bolderColor: 'pink',
            textColor: 'lavender',
        },
    },

    nocturne_bloom: {
        // 夜曲花事
        palette: 'frappe',
        reasoning: {
            titleColor: 'blue',
            bolderColor: 'overlay0',
            textColor: 'lavender',
        },
        assistant: {
            titleColor: 'lavender',
            bolderColor: 'mauve',
            textColor: 'pink',
        },
        toolsCall: {
            titleColor: 'flamingo',
            bolderColor: 'red',
            textColor: 'peach',
        },
    },

    ember_script: {
        // 余烬书简
        palette: 'macchiato',
        reasoning: {
            titleColor: 'yellow',
            bolderColor: 'peach',
            textColor: 'maroon',
        },
        assistant: {
            titleColor: 'peach',
            bolderColor: 'maroon',
            textColor: 'rosewater',
        },
        toolsCall: {
            titleColor: 'red',
            bolderColor: 'overlay1',
            textColor: 'flamingo',
        },
    },

    whispering_pine: {
        // 松林低语
        palette: 'mocha',
        reasoning: {
            titleColor: 'green',
            bolderColor: 'overlay0',
            textColor: 'teal',
        },
        assistant: {
            titleColor: 'teal',
            bolderColor: 'sapphire',
            textColor: 'sky',
        },
        toolsCall: {
            titleColor: 'sky',
            bolderColor: 'overlay0',
            textColor: 'blue',
        },
    },

    violet_tides: {
        // 紫罗兰潮汐
        palette: 'macchiato',
        reasoning: {
            titleColor: 'mauve',
            bolderColor: 'overlay0',
            textColor: 'lavender',
        },
        assistant: {
            titleColor: 'pink',
            bolderColor: 'flamingo',
            textColor: 'mauve',
        },
        toolsCall: {
            titleColor: 'lavender',
            bolderColor: 'overlay1',
            textColor: 'teal',
        },
    },
}
