import { color } from "../util/color-utils"
import { print, stringWidth } from "../util/common-utils"
import { terminal } from "../util/platform-utils"

export class SplitLine {
    private hasPrint: boolean = false
    private multiPrint: boolean 
    private title: string
    private splitter: string
    private newLine: boolean

    constructor({title, multiPrint = false, splitter = '-', newLine = false} :{title: string, multiPrint?: boolean, splitter?: string, newLine?: boolean}) {
        this.title = title
        this.multiPrint = multiPrint
        this.splitter = splitter
        this.newLine = newLine
    }

    private canPrint = () => {
        if(this.multiPrint) {
            return true
        }
        return !this.hasPrint
    }

    private splitInfo = () => {
        const fillSize = terminal.column - stringWidth(this.title)
        const prefix = Math.floor(fillSize / 2)
        const suffix = fillSize - prefix
        const fill = (n: number) => color.pink(this.splitter.repeat(n))
        return `${this.newLine ? '\n' : ''}${fill(prefix)}${color.red.bold(this.title)}${fill(suffix)}\n`
    }

    draw = () => {
        if(this.canPrint()) {
            this.hasPrint = true
            print(this.splitInfo())
        }
    }

}