import stringWidth from "string-width"
import { llmTableConfig } from "./llm-utils"
import wrapAnsi from "wrap-ansi"

export class ShowWin {

    private arr: string[] = []
    private winIdx: number = 0
    private winSize: number = 0
    private maxSize: number
    private cellSize: number = llmTableConfig.columns?.[0].width ?? 70 

    constructor(rowSize: number = 25, cellSize?: number) {
        if(cellSize) {
            this.cellSize = cellSize
        }
        this.maxSize = this.cellSize * rowSize
    }

    push = (str: string) => {
        const newStrSize = this.strWidth(str)
        this.winSize += newStrSize
        if (this.winSize <= this.maxSize) {
            this.arr.push(str)
            return
        }
        let size: number = 0
        do {
            const removeSize = this.strWidth(this.arr[this.winIdx])
            size += removeSize
            this.winIdx++
            this.winSize -= removeSize
        } while (size < newStrSize)
        this.arr.push(str)
    }

    show = () => {
        return wrapAnsi(this.arr.slice(this.winIdx).join(''), this.cellSize)
    }

    private strWidth = (str: string) => {
        let size = stringWidth(str)
        const s = str.split('\n')
        if (s.length > 1) {
            size += (s.length - 1) * this.cellSize
        }
        return size
    }

    isEmpty = () => this.arr.length === 0

    pageContent = () => {
        return this.pageSplit(this.arr)
    }

    content = () => this.arr.join('')

    pageSplit = (strArr: string[]) => {
        const res: string[] = []
        const tmp: string[] = []
        let size = 0
        const reset = () => {
            size = 0
            res.push(wrapAnsi(tmp.join(''), this.cellSize))
            tmp.length = 0
        }
        for (let index = 0; index < strArr.length; index++) {
            const str = strArr[index]
            tmp.push(str)
            const strSize = this.strWidth(str)
            size += strSize
            if (size >= this.maxSize) {
                reset()
            }
        }
        if (size !== 0) {
            reset()
        }
        return res

    }
}