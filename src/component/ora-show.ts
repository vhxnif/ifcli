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
                    '✶',
                    '✦',
                    '✧',
                    '✻',
                    '✾',
                    '✽',
                    '✿',
                    '❀',
                    '❀',
                    '❀',
                    '✿',
                    '✽',
                    '✾',
                    '✻',
                    '✧',
                    '✦',
                    '✶',
                    '⋆',
                    '⋆',
                    '✶',
                    '✦',
                    '✧',
                    '✷',
                    '✹',
                    '✺',
                    '❁',
                    '❂',
                    '❂',
                    '❂',
                    '❁',
                    '✺',
                    '✹',
                    '✷',
                    '✧',
                    '✦',
                    '✶',
                    '⋆',
                ],
            },
        })
    }

    start(msg?: string): void {
        if (this.isStop) {
            this.spinner.start()
            this.isStop = false
            if (msg) {
                this.show(msg)
            }
        }
    }

    stop(): void {
        this.inProgressRun(() => {
            this.spinner.stop()
            this.isStop = true
            sleep(100)
        })
    }

    show(text: string): void {
        this.inProgressRun(() => {
            this.spinner.text = text
        })
    }

    fail(msg: string): void {
        this.inProgressRun(() => {
            this.spinner.fail(msg)
            this.isStop = true
        })
    }

    private inProgressRun(f: () => void): void {
        if (this.isStop) {
            return
        }
        f()
    }
}
