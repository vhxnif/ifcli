import { sleep } from 'bun'
import type { Color, Ora } from 'ora'
import ora from 'ora'
import spinners from 'unicode-animations'
import type { SpinnerName, TerminalColorName } from './theme/theme-type'

export class OraShow {
    private spinner: Ora
    private isStop: boolean = true
    private color: Color

    constructor(
        initMessage: string,
        spinnerName: SpinnerName = 'helix',
        color: Color = 'magenta',
    ) {
        this.color = color
        const { frames, interval } = spinners[spinnerName]
        this.spinner = ora({
            text: initMessage,
            spinner: { frames: frames.slice(), interval },
            color,
            indent: 1,
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

    async stop(): Promise<void> {
        this.inProgressRun(() => {
            this.spinner.stop()
            this.isStop = true
        })
        await sleep(100)
    }

    show(text: string): void {
        this.inProgressRun(() => {
            this.spinner.text = text
        })
    }

    setColor(color: Color): void {
        this.inProgressRun(() => {
            this.spinner.color = color
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
