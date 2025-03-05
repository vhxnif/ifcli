import stringWidth from "string-width"

export class ShowWin {

    private arr: string[] = []
    private winIdx: number = 0
    private winSize: number = 0
    private maxSize: number
    private cellSize: number

    constructor(cellSize: number, rowSize: number) {
        this.cellSize = cellSize
        this.maxSize = cellSize * rowSize
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
        return this.arr.slice(this.winIdx).join('')
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
        const res: string[] = []
        const tmp: string[] = []
        let size = 0
        const reset = () => {
            size = 0
            res.push(tmp.join(''))
            tmp.length = 0
        }
        for (let index = 0; index < this.arr.length; index++) {
            const str = this.arr[index]
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

    consent = () => this.arr.join('')
}