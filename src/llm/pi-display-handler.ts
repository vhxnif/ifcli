/**
 * [INPUT]: 依赖 chalk/ora 终端库，依赖 ../component/ora-show 的 OraShow，
 *          依赖 ../component/theme/theme-type 的 ChalkChatBoxTheme/ChalkTerminalColor/SpinnerName，
 *          依赖 ./pi-types 的 PiDisplayEvent
 * [OUTPUT]: PiDisplayHandler 类 + DEFAULT_PI_COLORS 色板 + PiColorRole/PiThemeColors 类型
 * [POS]: src/llm/ 的终端渲染层，替代旧 simplified-display.ts + display-output-handler.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import chalk from 'chalk'
import type { Color } from 'ora'
import { OraShow } from '../component/ora-show'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
    SpinnerName,
} from '../component/theme/theme-type'
import { print, println } from '../util/common-utils'
import type { PiDisplayEvent } from './pi-types'

// ── Pi 事件色板 ──

export type PiColorRole =
    | 'assistant' // 助手回复正文
    | 'thinking' // thinking 内容
    | 'tool' // 工具名称/结果
    | 'toolArgs' // 工具参数
    | 'done' // 完成状态/用量
    | 'error' // 错误
    | 'user' // 用户输入回显
    | 'system' // 系统消息/compaction 标记
    | 'compaction' // compaction 提示
    | 'branchSummary' // 分支总结

export type PiThemeColors = Record<PiColorRole, Color>

export interface PiDisplayOptions {
    color: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    piColors: PiThemeColors
    enableSpinner?: boolean
    spinnerName?: SpinnerName
    /** 静默模式：只输出最终结果，不展示过程（思考、工具调用、用量等） */
    quiet?: boolean
}

// ── 默认 Pi 色板 ──

export const DEFAULT_PI_COLORS: PiThemeColors = {
    assistant: 'white',
    thinking: 'gray',
    tool: 'magenta',
    toolArgs: 'gray',
    done: 'green',
    error: 'red',
    user: 'cyan',
    system: 'blue',
    compaction: 'yellow',
    branchSummary: 'yellow',
}

// ── 实现 ──

export class PiDisplayHandler {
    private color: ChalkTerminalColor
    private theme: ChalkChatBoxTheme
    private piColors: PiThemeColors
    private spinner?: OraShow
    private currentMode: 'idle' | 'thinking' | 'assistant' | 'tool' = 'idle'
    private quiet: boolean
    private textBuffer: string = ''

    constructor(options: PiDisplayOptions) {
        this.color = options.color
        this.theme = options.theme
        this.piColors = options.piColors
        this.quiet = options.quiet ?? false

        if (options.enableSpinner !== false) {
            this.spinner = new OraShow(
                chalk[this.piColors.thinking]('Thinking...'),
                options.spinnerName ?? 'helix',
                this.piColors.thinking as Color,
            )
            this.spinner.start()
        }
    }

    // ── Pi 事件处理 ──

    /** text_delta: 助手回复正文 */
    onTextDelta(delta: string): void {
        if (this.quiet) {
            this.textBuffer += delta
            return
        }
        this.transitionTo('assistant')
        this.spinner?.stop()
        print(this.theme.assisant.content(delta))
    }

    /** text_end: 文本块结束 */
    onTextEnd(_content: string): void {
        // 仅作为段落标记，不额外输出
    }

    /** thinking_delta: 思考过程 */
    onThinkingDelta(delta: string): void {
        if (this.quiet) {
            return
        }
        this.transitionTo('thinking')
        this.spinner?.stop()
        print(chalk[this.piColors.thinking](delta))
    }

    /** thinking_end: 思考结束 */
    onThinkingEnd(_content: string): void {
        // 回到 idle，等待 assistant 或 tool
        this.currentMode = 'idle'
    }

    /** toolcall_start: 工具调用开始 */
    onToolcallStart(name: string): void {
        if (this.quiet) {
            return
        }
        this.transitionTo('tool')
        this.spinner?.stop()
        println('')
        println(
            chalk[this.piColors.tool].bold(`[tool:${name}]`) +
                chalk[this.piColors.toolArgs](' ...'),
        )
    }

    /** toolcall_end: 工具调用完成 */
    onToolcall(name: string, args: string): void {
        if (this.quiet) {
            return
        }
        const truncated =
            args.length > 200
                ? `${args.slice(0, 100)}...${args.slice(-100)}`
                : args
        println('')
        println(
            chalk[this.piColors.tool].bold(`[tool:${name}]`) +
                ' → ' +
                chalk[this.piColors.toolArgs](truncated),
        )
        this.currentMode = 'idle'
    }

    /** done: 完成 */
    onDone(usage?: PiDisplayEvent['usage']): void {
        this.spinner?.stop()
        if (this.quiet) {
            if (this.textBuffer) {
                println(this.theme.assisant.content(this.textBuffer))
            }
            this.currentMode = 'idle'
            return
        }
        if (usage) {
            const parts = [
                `in: ${usage.input}`,
                `out: ${usage.output}`,
                `total: ${usage.total}`,
            ]
            if (usage.cacheRead) parts.push(`cacheRead: ${usage.cacheRead}`)
            if (usage.cacheWrite) parts.push(`cacheWrite: ${usage.cacheWrite}`)
            if (usage.cacheWrite1h)
                parts.push(`cacheWrite1h: ${usage.cacheWrite1h}`)
            if (usage.reasoning) parts.push(`reasoning: ${usage.reasoning}`)
            println('')
            println(chalk[this.piColors.done](`✓ (${parts.join(', ')})`))
        }
        this.currentMode = 'idle'
    }

    /** error: 错误 */
    onError(message?: string): void {
        this.spinner?.fail(chalk[this.piColors.error](message ?? 'Error'))
        this.currentMode = 'idle'
    }

    /** 用户消息回显（可由上层调用） */
    onUserInput(content: string): void {
        println('')
        println(
            chalk[this.piColors.user].bold('▸ ') +
                chalk[this.piColors.user](content),
        )
        println('')
    }

    /** compaction/系统提示 */
    onSystem(message: string): void {
        println(chalk[this.piColors.system](message))
    }

    /** 停止 spinner */
    stop(): void {
        this.spinner?.stop()
    }

    // ── 内部 ──

    private transitionTo(mode: 'thinking' | 'assistant' | 'tool'): void {
        if (this.currentMode !== mode) {
            if (this.currentMode !== 'idle') {
                // 段落分隔
                println('')
            }
            this.currentMode = mode
        }
    }
}
