/**
 * [INPUT]: 依赖 ../llm/base 集中提供的 Pi Message/Model/Models/ThinkingLevel，依赖 ../llm/agent-runner 的 AgentRunner，
 *          依赖 ../llm/pi-display-handler 的 PiDisplayHandler/PiThemeColors，
 *          依赖 ../llm/tool-registry 的 ToolRegistry，
 *          依赖 ../store/agent-manager 的 AgentManager/AgentHandle/SessionHandle，
 *          依赖 ../config/app-setting 的 Setting
 * [OUTPUT]: ChatService 类（listSessions/createSession/getSession/deleteSession/runChat + active agent 读写），透传 agent skills 到 ToolRegistry
 * [POS]: src/action/ 的编排层，替代旧 chat-action.ts + action-types.ts + command-action.ts，被 CLI 命令消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { ThemeScheme } from '../component/theme/theme-type'
import type { Setting } from '../config/app-setting'
import { AgentRunner } from '../llm/agent-runner'
import type { Message, Model, Models, ThinkingLevel } from '../llm/base'
import { generate } from '../llm/generate-session-name'
import { PiDisplayHandler } from '../llm/pi-display-handler'
import type { ToolRegistry } from '../llm/tool-registry'
import type {
    AgentHandle,
    AgentManager,
    SessionHandle,
} from '../store/agent-manager'

// ── 工具 ──

/** 拆分 "provider/modelId"，modelId 本身可含斜杠（如 openrouter/z-ai/glm-5.2:free） */
function splitModelStr(modelStr: string): [string, string] {
    const sep = modelStr.indexOf('/')
    if (sep === -1) return ['', modelStr]
    return [modelStr.slice(0, sep), modelStr.slice(sep + 1)]
}

// ── 类型 ──

export interface ChatServiceConfig {
    agentManager: AgentManager
    toolRegistry: ToolRegistry
    themeScheme: ThemeScheme
    models: Models
}

export interface ChatRunOptions {
    content: string
    agentId: string
    sessionId: string
    noStream?: boolean
    modelStr?: string // "provider/modelId" — 覆盖 agent 默认模型
    thinkingLevel?: ThinkingLevel
    clean?: boolean
}

export interface NewAgentOptions {
    name: string
    modelStr: string
    thinkingLevel?: ThinkingLevel
    systemPrompt?: string
    activeMcps?: string[]
    activeCustomTags?: string[]
    skills?: string[]
}

export interface NewSessionOptions {
    agentId: string
    name: string
}

// ── ChatService ──

export class ChatService {
    private agentManager: AgentManager
    private toolRegistry: ToolRegistry
    private themeScheme: ThemeScheme
    private models: Models

    constructor(config: ChatServiceConfig) {
        this.agentManager = config.agentManager
        this.toolRegistry = config.toolRegistry
        this.themeScheme = config.themeScheme
        this.models = config.models
    }

    // ── Agent CRUD ──

    listAgents() {
        return this.agentManager.listAgents()
    }

    createAgent(opts: NewAgentOptions): string {
        const info = this.agentManager.createAgent(opts.name, {
            model: opts.modelStr,
            thinkingLevel: opts.thinkingLevel ?? 'off',
            systemPrompt: opts.systemPrompt,
            activeMcps: opts.activeMcps,
            activeCustomTags: opts.activeCustomTags,
            skills: opts.skills,
        })
        return info.id
    }

    getAgent(id: string): AgentHandle {
        return this.agentManager.getAgent(id)
    }

    deleteAgent(id: string): void {
        this.agentManager.deleteAgent(id)
    }

    // ── Session CRUD ──

    getActiveAgentId(): string | undefined {
        return this.agentManager.getActiveAgentId()
    }

    setActiveAgentId(id: string): void {
        this.agentManager.setActiveAgentId(id)
    }

    listSessions(agentId: string) {
        return this.agentManager.listSessions(agentId)
    }

    createSession(opts: NewSessionOptions): string {
        const info = this.agentManager.createSession(opts.agentId, opts.name)
        return info.id
    }

    getSession(id: string): SessionHandle {
        return this.agentManager.getSession(id)
    }

    deleteSession(id: string): void {
        this.agentManager.deleteSession(id)
    }

    switchSession(id: string): void {
        this.agentManager.switchSession(id)
    }

    // ── 主对话流程 ──

    async runChat(opts: ChatRunOptions): Promise<void> {
        const agentMeta = this.agentManager.getAgentMeta(opts.agentId)
        const handle = this.agentManager.getSession(opts.sessionId)

        // 确定模型
        const modelStr = opts.modelStr || agentMeta.model
        const thinkingLevel = opts.thinkingLevel ?? agentMeta.thinkingLevel

        // 从 Pi Models 注册表解析真实 Model 对象
        const model = this.resolveModel(modelStr)

        // 按 agent 配置启用工具
        this.toolRegistry.setActiveMcps(agentMeta.activeMcps)
        this.toolRegistry.setActiveCustomTools(agentMeta.activeCustomTags)
        this.toolRegistry.setActiveSkills(agentMeta.skills)

        // 构建 tools
        const tools = await this.toolRegistry.buildActiveTools()

        // 构建上下文
        const context = await handle.buildContext()
        const contextMessages = opts.clean
            ? []
            : (context.messages as Message[])

        // 显示处理器
        const display = new PiDisplayHandler({
            themeScheme: this.themeScheme,
            enableSpinner: !opts.noStream,
            quiet: opts.noStream,
        })

        // 运行 agent
        const runner = new AgentRunner({
            model,
            tools,
            systemPrompt: agentMeta.systemPrompt || '',
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
                case 'toolcall':
                    display.onToolcall(
                        event.toolName ?? '',
                        event.toolArgs ?? '',
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
                await this.agentManager.autoName(handle, async (_content) => {
                    if (!this.currentSetting?.session.autoName.enabled) {
                        return ''
                    }
                    if (!this.currentSetting?.session.autoName.model) {
                        return ''
                    }
                    const [provider, id] = splitModelStr(
                        this.currentSetting.session.autoName.model,
                    )
                    return await generate(_content, provider, id)
                })
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
        const [provider, id] = splitModelStr(modelStr)
        const model = provider && id ? this.models.getModel(provider, id) : null
        if (model) return model
        throw new Error(
            `Model unavailable: ${modelStr}. Select a current model with "ict -f <agent> config -m".`,
        )
    }
}
