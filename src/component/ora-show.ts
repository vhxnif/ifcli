/**
 * [INPUT]: 依赖 Bun sleep、ora 与 unicode-animations，依赖主题类型约束 spinner 和色板
 * [OUTPUT]: OraShow 终端运行状态组件
 * [POS]: src/component/ 的 spinner 适配器，为调用方隐藏 Ora 生命周期与主题映射
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { sleep } from 'bun'
import type { ChalkInstance } from 'chalk'
import type { Ora } from 'ora'
import ora from 'ora'
import spinners from 'unicode-animations'
import type { SpinnerName, TerminalColorName } from './theme/theme-type'

export class OraShow {
    private spinner: Ora
    private isStop: boolean = true
    private chalkColor: Record<TerminalColorName, ChalkInstance>
    constructor(
        initMessage: string,
        spinnerName: SpinnerName = 'helix',
        chalkColor: Record<TerminalColorName, ChalkInstance>,
    ) {
        this.chalkColor = chalkColor
        const { frames, interval } = spinners[spinnerName]
        this.spinner = ora({
            text: this.chalkColor.magenta(initMessage),
            spinner: { frames: frames.slice(), interval },
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
            this.spinner.text = this.chalkColor.magenta(text)
        })
    }

    fail(msg: string): void {
        this.inProgressRun(() => {
            this.spinner.fail(this.chalkColor.red(msg))
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
