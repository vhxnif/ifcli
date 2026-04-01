import type { ChalkInstance } from 'chalk'
import { isEmpty, print, println, stringWidth } from '../util/common-utils'
import { terminal } from '../util/platform-utils'
import {
    BorderStyles,
    type BorderStyle,
    type BorderChars,
} from './display/border-style'

export type TextShowTheme = {
    titleColor: ChalkInstance
    bolderColor: ChalkInstance
    textColor: ChalkInstance
}

export type TextShowOptions = {
    title: string
    titleColor: ChalkInstance
    bolderColor: ChalkInstance
    textColor: ChalkInstance
    structured?: boolean
    render?: boolean
    borderStyle?: BorderStyle
}

export class TextShow {
    private readonly title: string
    private readonly titleColor: ChalkInstance
    private readonly bolderColor: ChalkInstance
    private readonly textColor: ChalkInstance
    private readonly border: BorderChars
    private content: string[] = []
    private active: boolean = false
    private structured: boolean = false
    private obj: Record<string, string> = {}
    private render: boolean

    constructor(options: TextShowOptions) {
        const {
            title,
            titleColor,
            bolderColor,
            textColor,
            structured = false,
            render = true,
            borderStyle = 'rounded',
        } = options
        this.title = title
        this.titleColor = titleColor
        this.bolderColor = bolderColor
        this.textColor = textColor
        this.structured = structured
        this.render = render
        this.border = BorderStyles[borderStyle]
    }

    start() {
        if (this.active) {
            return
        }
        const fillSize = terminal.column - stringWidth(this.title)
        const prefix = Math.floor(fillSize / 2) - 2
        const suffix = fillSize - prefix - 4
        const sp = `\n${this.bolderColor(this.border.tl)}${this.fill(
            prefix
        )} ${this.titleColor(this.title)} ${this.fill(
            suffix
        )}${this.bolderColor(this.border.tr)}`
        this.println(sp)
        this.active = true
        if (this.structured) {
            this.obj = {}
        }
    }

    stop() {
        if (!this.active) {
            return
        }
        const fillSize = terminal.column - 2
        const sp = `\n${this.bolderColor(this.border.bl)}${this.fill(
            fillSize
        )}${this.bolderColor(this.border.br)}`
        this.println(sp)
        this.active = false
        if (this.structured) {
            this.content.push(JSON.stringify(this.obj))
            this.obj = {}
        }
    }

    append(
        text: string,
        options?: {
            textColor?: (str: string) => string
            key?: string
        }
    ) {
        this.start()
        if (this.structured) {
            this.structuredPush(text, options?.key)
        } else {
            this.content.push(text)
        }
        if (options?.textColor) {
            this.print(options?.textColor(text))
            return
        }
        this.print(this.textColor(text))
    }

    getContent() {
        return this.content
    }

    private fill(n: number) {
        return this.bolderColor(this.border.h.repeat(n))
    }

    private structuredPush(value: string, key?: string) {
        if (key) {
            if (isEmpty(key) || isEmpty(value)) {
                return
            }
            this.obj[key] = value
        }
    }

    private print(str: string) {
        if (this.render) {
            print(str)
        }
    }

    private println(str: string) {
        if (this.render) {
            println(str)
        }
    }
}
