/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 的 Message/Model/Context/Tool/AssistantMessage 类型,
 *          依赖 @earendil-works/pi-agent-core 的 AgentMessage/AgentTool/ThinkingLevel 类型
 * [OUTPUT]: 重导出 Pi 类型，定义 SessionEntry/SessionStorage/SessionMeta/ChatConfig/CustomToolDef/PiDisplayEvent（含 usage 缓存字段）
 * [POS]: src/llm/ 的类型基石，被 agent-runner/pi-display-handler/tool-registry/session-storage/session-manager/chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 *
 * 核心类型 — 基于 Pi 的 AgentMessage / SessionTree / SessionStorage。
 * 替代旧的 llm-types.ts + store-types.ts。
 */

import type {
    AgentMessage,
    AgentTool,
    ThinkingLevel,
} from '@earendil-works/pi-agent-core'
import type {
    Api,
    AssistantMessage,
    Context,
    Message,
    Model,
    SimpleStreamOptions,
    Tool,
} from '@earendil-works/pi-ai'

// ── 重导出 Pi 类型（方便其他模块使用） ──

export type {
    AgentMessage,
    AgentTool,
    Api,
    AssistantMessage,
    Context,
    Message,
    Model,
    SimpleStreamOptions,
    ThinkingLevel,
    Tool,
}

// ── Session Tree Entry 类型 ──

export type SessionEntryType =
    | 'message'
    | 'compaction'
    | 'branch_summary'
    | 'model_change'
    | 'thinking_level_change'
    | 'label'
    | 'system_prompt'
    | 'custom'

export interface SessionEntry {
    id: string
    sessionId: string
    parentId: string | null
    entryType: SessionEntryType
    /** JSON-serialized payload (AgentMessage or structured metadata) */
    content: string
    /** 同 parent 下的顺序 */
    order: number
    timestamp: number
}

// ── Session (chat) 元数据 ──

export interface SessionMeta {
    name: string
    /** provider/modelId，如 "deepseek/deepseek-chat" */
    model: string
    /** thinking level */
    thinkingLevel: ThinkingLevel
    /** 系统提示词 */
    systemPrompt: string
    /** 当前 session 启用的 MCP 服务器名 */
    activeMcps: string[]
    /** 当前 session 启用的自定义工具标签 */
    activeCustomTags: string[]
    createdAt: number
    updatedAt: number
}

// ── SessionStorage 接口（对齐 Pi SessionStorage） ──

export interface SessionStorage {
    getMetadata(): Promise<SessionMeta>
    setMetadata(meta: Partial<SessionMeta>): Promise<void>
    getLeafId(): Promise<string | null>
    setLeafId(entryId: string): Promise<void>
    getEntry(id: string): Promise<SessionEntry | undefined>
    getEntries(): Promise<SessionEntry[]>
    appendEntry(
        entry: Omit<SessionEntry, 'order' | 'timestamp'>,
    ): Promise<string>
    getPathToRoot(fromId?: string | null): Promise<SessionEntry[]>
    findEntries(entryType: SessionEntryType): Promise<SessionEntry[]>
}

// ── ChatConfig（替代旧 ChatConfig，精简） ──

export interface ChatConfig {
    model: string // "provider/modelId"
    thinkingLevel: ThinkingLevel
    systemPrompt: string
    compactionEnabled: boolean
}

// ── 工具注册相关 ──

export type CustomToolDef = {
    def: {
        type: 'function'
        function: {
            name: string
            description: string
            parameters: Record<string, unknown>
        }
    }
    tags: string[]
    command: string[]
}

// ── Display 事件（围绕 Pi 事件设计） ──

export type PiEventType =
    | 'text_delta'
    | 'text_end'
    | 'thinking_delta'
    | 'thinking_end'
    | 'toolcall_start'
    | 'toolcall_delta'
    | 'toolcall_end'
    | 'done'
    | 'error'

export interface PiDisplayEvent {
    type: PiEventType
    content?: string
    toolName?: string
    toolResult?: string
    usage?: {
        input: number
        output: number
        total: number
        cacheRead?: number
        cacheWrite?: number
        cacheWrite1h?: number
        reasoning?: number
    }
    error?: string
}
