import type { ChalkInstance } from 'chalk'
import { llmTableConfig } from './llm-utils'
import { stringWidth } from '../util/common-utils'

export class ShowWin {
    private arr: string[] = []
    private rowSize: number
    private cellSize: number = llmTableConfig.columns?.[0].width ?? 70

    constructor(rowSize: number = 25, cellSize?: number) {
        if (cellSize) {
            this.cellSize = cellSize
        }
        this.rowSize = rowSize
    }

    push = (str: string) => this.arr.push(str)

    show = (color: ChalkInstance) => {
        const pages = this.pageContent()
        return color(pages[pages.length-1])
    }

    isEmpty = () => this.arr.length === 0

    pageContent = () => {
        const content = this.content()
        const rows = content.split('\n').reduce((arr, it) => { 
            return [...arr, ...this.splitRow(it)]
        }, [] as string[])
        return Array.from(
            { length: Math.ceil(rows.length / this.rowSize) },
            (_, index) => rows.slice(index * this.rowSize, (index + 1) * this.rowSize)
        ).map(it => it.join("\n"))
    }

    content = () => this.arr.join('')


    private splitRow = (str: string) => {
        const res: string[] = []
        const tmp: string[] = []
        let i = 0
        const reset = () => {
            i = 0
            res.push(tmp.join(''))
            tmp.length = 0
        }
        for (let index = 0; index < str.length; index++) {
            const c = str[index]
            i += stringWidth(c)
            if(i >= this.cellSize) {
                reset()
            }
            tmp.push(c)
        }
        if(i > 0) {
            reset()
        }
        return res
    } 
}
