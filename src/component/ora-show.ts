import { sleep } from 'bun'
import type { Ora } from 'ora'
import ora from 'ora'

export class OraShow {
    private spinner: Ora
    private isStop: boolean = true

    constructor(initMessage: string) {
        this.spinner = ora({
            text: initMessage,
            spinner: {
                frames: [
                    '⋆',
                    '✦',
                    '✧',
                    '✶',
                    '✷',
                    '✸',
                    '✹',
                    '✺',
                    '✻',
                    '✼',
                    '✽',
                    '✾',
                    '✿',
                    '❀',
                    '❁',
                    '❂',
                ],
            },
        })
    }

    start = (msg?: string) => {
        if (this.isStop) {
            this.spinner.start()
            this.isStop = false
            if (msg) {
                this.show(msg)
            }
        }
    }

    stop = () => {
        this.inProgressRun(() => {
            this.spinner.stop()
            this.isStop = true
            sleep(100)
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
