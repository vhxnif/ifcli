/**
 * [INPUT]: 依赖 chalk/ora 终端库，依赖 ../component/ora-show 的 OraShow，
 *          依赖 ../component/theme/theme-type 的 ChalkChatBoxTheme/ChalkTerminalColor/SpinnerName
 * [OUTPUT]: PiDisplayHandler 类 + DEFAULT_PI_COLORS 色板 + PiColorRole/PiThemeColors 类型
 * [POS]: src/llm/ 的终端渲染层，替代旧 simplified-display.ts + display-output-handler.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import chalk from 'chalk'
import type { Color } from 'ora'
import { print, println } from '../util/common-utils'
import { OraShow } from '../component/ora-show'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
    SpinnerName,
} from '../component/theme/theme-type'

// ── Pi 事件色板 ──

export type PiColorRole =
    | 'assistant'   // 助手回复正文
    | 'thinking'    // thinking 内容
    | 'tool'        // 工具名称/结果
    | 'toolArgs'    // 工具参数
    | 'done'        // 完成状态/用量
    | 'error'       // 错误
    | 'user'        // 用户输入回显
    | 'system'      // 系统消息/compaction 标记
    | 'compaction'  // compaction 提示
    | 'branchSummary' // 分支总结

export type PiThemeColors = Record<PiColorRole, Color>

export interface PiDisplayOptions {
    color: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    piColors: PiThemeColors
    enableSpinner?: boolean
    spinnerName?: SpinnerName
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
    private pendingToolName: string | null = null
    private currentMode: 'idle' | 'thinking' | 'assistant' | 'tool' = 'idle'

    constructor(options: PiDisplayOptions) {
        this.color = options.color
        this.theme = options.theme
        this.piColors = options.piColors

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
        this.transitionTo('tool')
        this.pendingToolName = name
        this.spinner?.stop()
        println('')
        println(
            chalk[this.piColors.tool].bold(`[tool:${name}]`) +
            chalk[this.piColors.toolArgs](' ...'),
        )
    }

    /** toolcall_delta: 工具参数流 */
    onToolcallDelta(delta: string): void {
        // 工具参数在 toolcall_end 时统一展示
    }

    /** toolcall_end: 工具调用完成 */
    onToolcallEnd(name: string, result: string): void {
        const truncated = result.length > 200
            ? `${result.slice(0, 100)}...${result.slice(-100)}`
            : result
        println(
            chalk[this.piColors.tool].bold(`[tool:${name}]`) +
            ' → ' +
            chalk[this.piColors.toolArgs](truncated),
        )
        this.pendingToolName = null
        this.currentMode = 'idle'
    }

    /** done: 完成 */
    onDone(usage?: { input: number; output: number; total: number }): void {
        this.spinner?.stop()
        if (usage) {
            println(
                chalk[this.piColors.done](
                    `✓ (in: ${usage.input}, out: ${usage.output}, total: ${usage.total})`,
                ),
            )
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
        println(chalk[this.piColors.user].bold('▸ ') + chalk[this.piColors.user](content))
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
