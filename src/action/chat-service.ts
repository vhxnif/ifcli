/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 的 Message/Model/SimpleStreamOptions，
 *          依赖 @earendil-works/pi-agent-core 的 AgentTool/ThinkingLevel，
 *          依赖 ../llm/agent-runner 的 AgentRunner，
 *          依赖 ../llm/pi-display-handler 的 PiDisplayHandler/DEFAULT_PI_COLORS/PiThemeColors，
 *          依赖 ../llm/tool-registry 的 ToolRegistry，
 *          依赖 ../store/session-manager 的 SessionManager/SessionHandle，
 *          依赖 ../config/app-setting 的 Setting
 * [OUTPUT]: ChatService 类（listSessions/createSession/getSession/deleteSession/runChat）
 * [POS]: src/action/ 的编排层，替代旧 chat-action.ts + action-types.ts + command-action.ts，被 CLI 命令消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { Message, Model, SimpleStreamOptions } from '@earendil-works/pi-ai'
import type { AgentTool, ThinkingLevel } from '@earendil-works/pi-agent-core'
import type { Setting } from '../config/app-setting'
import { AgentRunner } from '../llm/agent-runner'
import { PiDisplayHandler } from '../llm/pi-display-handler'
import type { PiThemeColors } from '../llm/pi-display-handler'
import { DEFAULT_PI_COLORS } from '../llm/pi-display-handler'
import { ToolRegistry } from '../llm/tool-registry'
import { SessionManager } from '../store/session-manager'
import type { SessionHandle } from '../store/session-manager'
import type { ChalkChatBoxTheme, ChalkTerminalColor } from '../component/theme/theme-type'

// ── 类型 ──

export interface ChatServiceConfig {
    sessionManager: SessionManager
    toolRegistry: ToolRegistry
    terminalColor: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    piColors: PiThemeColors
}

export interface ChatRunOptions {
    content: string
    sessionId: string
    noStream?: boolean
    modelStr?: string   // "provider/modelId" — 覆盖 session 默认模型
    thinkingLevel?: ThinkingLevel
}

export interface NewSessionOptions {
    name: string
    modelStr: string
    thinkingLevel?: ThinkingLevel
    systemPrompt?: string
}

// ── ChatService ──

export class ChatService {
    private sessionManager: SessionManager
    private toolRegistry: ToolRegistry
    private terminalColor: ChalkTerminalColor
    private theme: ChalkChatBoxTheme
    private piColors: PiThemeColors

    constructor(config: ChatServiceConfig) {
        this.sessionManager = config.sessionManager
        this.toolRegistry = config.toolRegistry
        this.terminalColor = config.terminalColor
        this.theme = config.theme
        this.piColors = config.piColors
    }

    // ── Session CRUD ──

    listSessions() {
        return this.sessionManager.list()
    }

    createSession(opts: NewSessionOptions): string {
        const info = this.sessionManager.create(
            opts.name,
            opts.modelStr,
            opts.thinkingLevel ?? 'off',
        )
        const handle = this.sessionManager.get(info.id)
        if (opts.systemPrompt) {
            handle.updateMeta({ systemPrompt: opts.systemPrompt })
        }
        return info.id
    }

    getSession(id: string): SessionHandle {
        return this.sessionManager.get(id)
    }

    deleteSession(id: string): void {
        this.sessionManager.delete(id)
    }

    // ── 主对话流程 ──

    async runChat(opts: ChatRunOptions): Promise<void> {
        const handle = this.sessionManager.get(opts.sessionId)
        const meta = await handle.storage.getMetadata()

        // 确定模型
        const modelStr = opts.modelStr || meta.model
        const thinkingLevel = opts.thinkingLevel ?? meta.thinkingLevel

        // 构建 Pi Model 对象（简化版 — 从 Pi Models 注册表解析）
        const model = this.makeModel(modelStr)

        // 构建 tools
        const tools = await this.toolRegistry.buildActiveTools()

        // 构建上下文
        const context = await handle.buildContext()
        const contextMessages = context.messages as Message[]

        // 显示处理器
        const display = new PiDisplayHandler({
            color: this.terminalColor,
            theme: this.theme,
            piColors: this.piColors,
            enableSpinner: !opts.noStream,
        })

        // 显示用户输入
        display.onUserInput(opts.content)

        // 运行 agent
        const runner = new AgentRunner({
            model,
            tools,
            systemPrompt: meta.systemPrompt || '',
            thinkingLevel,
        })

        // 桥接 PiDisplayEvent → PiDisplayHandler
        runner.onDisplay(event => {
            switch (event.type) {
                case 'text_delta':
                    display.onTextDelta(event.content ?? '')
                    break
                case 'text_end':
                    display.onTextEnd(event.content ?? '')
                    break
                case 'thinking_delta':
                    display.onThinkingDelta(event.content ?? '')
                    break
                case 'thinking_end':
                    display.onThinkingEnd(event.content ?? '')
                    break
                case 'toolcall_start':
                    display.onToolcallStart(event.toolName ?? '')
                    break
                case 'toolcall_end':
                    display.onToolcallEnd(
                        event.toolName ?? '',
                        event.toolResult ?? '',
                    )
                    break
                case 'done':
                    display.onDone(event.usage)
                    break
                case 'error':
                    display.onError(event.error)
                    break
                default:
                    break
            }
        })

        try {
            const newMessages = await runner.run(opts.content, contextMessages)

            // 保存消息到 session
            for (const msg of newMessages) {
                await handle.appendMessage(msg)
            }

            // 自动命名
            const setting = this.currentSetting
            if (setting?.session?.autoName?.enabled) {
                await this.sessionManager.autoName(
                    handle,
                    async (content, modelStr) => {
                        // 使用 session.autoName.model 指定的便宜模型
                        const nameModel = setting.session.autoName.model
                        // ponytail: autoName 复用 Pi streamSimple，不做额外封装
                        return ''  // 占位，实际由外部注入
                    },
                )
            }
        } catch (e: unknown) {
            display.onError(e instanceof Error ? e.message : String(e))
        } finally {
            await this.toolRegistry.closeAll()
        }
    }

    // ── 辅助 ──

    private currentSetting: Setting | null = null

    /** 设置当前应用配置（供内部使用） */
    setSetting(s: Setting): void {
        this.currentSetting = s
    }

    /** 从 modelStr ("provider/modelId") 构建简化的 Pi Model 对象 */
    private makeModel(modelStr: string): Model<any> {
        const [provider, id] = modelStr.split('/')
        return {
            id: id ?? modelStr,
            name: id ?? modelStr,
            api: 'openai-completions',
            provider: provider ?? '',
            baseUrl: '',
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
        } as Model<any>
    }
}
