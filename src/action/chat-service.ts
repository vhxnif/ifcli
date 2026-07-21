/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 的 Message/Model/Models，
 *          依赖 @earendil-works/pi-agent-core 的 ThinkingLevel，
 *          依赖 ../llm/agent-runner 的 AgentRunner，
 *          依赖 ../llm/pi-display-handler 的 PiDisplayHandler/PiThemeColors，
 *          依赖 ../llm/tool-registry 的 ToolRegistry，
 *          依赖 ../store/session-manager 的 SessionManager/SessionHandle，
 *          依赖 ../config/app-setting 的 Setting
 * [OUTPUT]: ChatService 类（listSessions/createSession/getSession/deleteSession/runChat）
 * [POS]: src/action/ 的编排层，替代旧 chat-action.ts + action-types.ts + command-action.ts，被 CLI 命令消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import type { Message, Model, Models } from '@earendil-works/pi-ai'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
} from '../component/theme/theme-type'
import type { Setting } from '../config/app-setting'
import { AgentRunner } from '../llm/agent-runner'
import type { PiThemeColors } from '../llm/pi-display-handler'
import { PiDisplayHandler } from '../llm/pi-display-handler'
import type { ToolRegistry } from '../llm/tool-registry'
import type { SessionHandle, SessionManager } from '../store/session-manager'

// ── 类型 ──

export interface ChatServiceConfig {
    sessionManager: SessionManager
    toolRegistry: ToolRegistry
    terminalColor: ChalkTerminalColor
    theme: ChalkChatBoxTheme
    piColors: PiThemeColors
    models: Models
}

export interface ChatRunOptions {
    content: string
    sessionId: string
    noStream?: boolean
    modelStr?: string // "provider/modelId" — 覆盖 session 默认模型
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
    private models: Models

    constructor(config: ChatServiceConfig) {
        this.sessionManager = config.sessionManager
        this.toolRegistry = config.toolRegistry
        this.terminalColor = config.terminalColor
        this.theme = config.theme
        this.piColors = config.piColors
        this.models = config.models
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
        const systemPrompt =
            opts.systemPrompt ??
            this.currentSetting?.session?.defaultSystemPrompt ??
            ''
        if (systemPrompt) {
            handle.updateMeta({ systemPrompt })
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

        // 从 Pi Models 注册表解析真实 Model 对象
        const model = this.resolveModel(modelStr)

        // 按 session 配置启用工具
        this.toolRegistry.setActiveMcps(meta.activeMcps)
        this.toolRegistry.setActiveCustomTools(meta.activeCustomTags)

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
            quiet: opts.noStream,
        })

        // 运行 agent
        const runner = new AgentRunner({
            model,
            tools,
            systemPrompt: meta.systemPrompt || '',
            thinkingLevel,
        })

        // 桥接 PiDisplayEvent → PiDisplayHandler
        runner.onDisplay((event) => {
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
                    async (_content, _modelStr) => {
                        // 使用 session.autoName.model 指定的便宜模型
                        // ponytail: autoName 复用 Pi streamSimple，不做额外封装
                        return '' // 占位，实际由外部注入
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

    /** 从 modelStr ("provider/modelId") 解析 Pi Model 对象 */
    private resolveModel(modelStr: string): Model<any> {
        const [provider, id] = modelStr.split('/')
        if (provider && id) {
            const found = this.models.getModel(provider, id)
            if (found) return found
        }
        // 指定的模型不在 Pi 注册表中：回退到第一个已知模型，避免使用伪造对象导致 agent 挂起
        const allModels = this.models.getModels()
        if (allModels.length > 0) {
            return allModels[0]
        }
        // 最后回退：构建最小 Model 对象
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
