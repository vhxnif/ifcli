import type { Ora } from 'ora'
import ora from 'ora'

export class OraShow {
    private spinner: Ora
    private isStop: boolean = false

    constructor(initMessage: string) {
        this.spinner = ora(initMessage)
    }

    start = () => {
        this.inProgressRun(() => this.spinner.start())
    }

    stop = () => {
        this.inProgressRun(() => {
            this.spinner.stop()
            this.isStop = true
        })
    }

    show = (text: string) => {
        this.inProgressRun(() => {
            this.spinner.text = text
        })
    }

    fail = (msg: string) => {
        this.inProgressRun(() => {
            this.spinner.fail(msg)
            this.isStop = true
        })
    }

    private inProgressRun = (f: () => void) => {
        if (this.isStop) {
            return
        }
        f()
    }
}
