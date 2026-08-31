/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 的 streamSimple/Model/Message，
 *          依赖 @earendil-works/pi-agent-core 的 Agent/AgentEvent/AgentMessage/AgentTool/ThinkingLevel，
 *          依赖 ../llm/pi-types 的 PiDisplayEvent
 * [OUTPUT]: AgentRunner 类（run 使用 Agent.prompt + waitForIdle，abort/onDisplay，customToolToAgentTool 辅助）
 * [POS]: src/llm/ 的 agent 封装层，替代旧 ask-flow.ts + open-ai-helper.ts，被 chat-service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type {
    AgentEvent,
    AgentMessage,
    AgentTool,
    ThinkingLevel,
} from '@earendil-works/pi-agent-core'
import { Agent } from '@earendil-works/pi-agent-core'
import type { AssistantMessage, Message, Model } from '@earendil-works/pi-ai'
import { streamSimple } from '@earendil-works/pi-ai/compat'
import type { PiDisplayEvent } from './pi-types'

// ── 配置 ──

export interface AgentRunnerConfig {
    model: Model<any>
    tools: AgentTool<any>[]
    systemPrompt: string
    thinkingLevel: ThinkingLevel
    /** Context 变换（compaction 等），返回处理后的 AgentMessage 列表 */
    transformContext?: (
        messages: AgentMessage[],
        signal?: AbortSignal,
    ) => Promise<AgentMessage[]>
}

// ── AgentRunner ──

export class AgentRunner {
    private config: AgentRunnerConfig
    private agent: Agent | null = null
    private displayCallback: ((event: PiDisplayEvent) => void) | null = null

    constructor(config: AgentRunnerConfig) {
        this.config = config
    }

    /** 设置显示回调 */
    onDisplay(callback: (event: PiDisplayEvent) => void): this {
        this.displayCallback = callback
        return this
    }

    /** 执行一轮对话 */
    async run(
        userContent: string,
        contextMessages: Message[],
    ): Promise<Message[]> {
        const { model, tools, systemPrompt, thinkingLevel, transformContext } =
            this.config

        // 记录原始上下文长度，用于只返回本轮新增消息
        const originalLength = contextMessages.length

        const agent = new Agent({
            initialState: {
                model,
                tools,
                systemPrompt,
                thinkingLevel,
                messages: contextMessages as AgentMessage[],
            },
            transformContext,
            streamFn: streamSimple,
        })

        this.agent = agent

        // 订阅 Pi Agent 事件 → 转换为 PiDisplayEvent
        agent.subscribe(async (event, _signal) => {
            this.handleAgentEvent(event)
        })

        // 通过 prompt 启动对话（steer 仅入队，不会触发运行）
        const userMsg: AgentMessage = {
            role: 'user',
            content: userContent,
            timestamp: Date.now(),
        } as AgentMessage

        await agent.prompt(userMsg)
        await agent.waitForIdle()

        // 只返回本轮新增消息（user + assistant + tool result），避免把已持久化的上下文再存一遍
        return (agent.state.messages as unknown as Message[]).slice(
            originalLength,
        )
    }

    /** 中止运行 */
    abort(): void {
        this.agent?.abort()
    }

    // ── 事件转换 ──

    private handleAgentEvent(event: AgentEvent): void {
        if (!this.displayCallback) return

        // Agent 层级事件
        switch (event.type) {
            case 'message_update': {
                // 提取内层 AssistantMessageEvent
                const inner = event.assistantMessageEvent
                this.handleAssistantMessageEvent(inner)
                break
            }
            case 'message_end':
                // 最终消息完成 — 检查 usage
                if (event.message.role === 'assistant') {
                    const am = event.message as AssistantMessage
                    if (am.errorMessage) {
                        this.displayCallback({
                            type: 'error',
                            error: am.errorMessage,
                        })
                        break
                    }
                    if (am.usage) {
                        this.displayCallback({
                            type: 'done',
                            usage: {
                                input: am.usage.input,
                                output: am.usage.output,
                                total: am.usage.totalTokens ?? 0,
                                cacheRead: am.usage.cacheRead,
                                cacheWrite: am.usage.cacheWrite,
                                cacheWrite1h: am.usage.cacheWrite1h,
                                reasoning: am.usage.reasoning,
                            },
                        })
                    }
                }
                break
            case 'agent_end':
                // 不额外处理，runner 自己处理
                break
            case 'turn_start':
            case 'turn_end':
            case 'message_start':
            case 'tool_execution_start':
            case 'tool_execution_update':
            case 'tool_execution_end':
            case 'agent_start':
                // 暂不处理这些事件，由 display handler 按需扩展
                break
        }
    }

    /** 处理 AssistantMessageEvent（SSE 级别事件） */
    private handleAssistantMessageEvent(
        event: import('@earendil-works/pi-ai').AssistantMessageEvent,
    ): void {
        if (!this.displayCallback) return

        switch (event.type) {
            case 'text_delta':
                this.displayCallback({
                    type: 'text_delta',
                    content: event.delta,
                })
                break
            case 'text_end':
                this.displayCallback({
                    type: 'text_end',
                    content: event.content,
                })
                break
            case 'thinking_delta':
                this.displayCallback({
                    type: 'thinking_delta',
                    content: event.delta,
                })
                break
            case 'thinking_end':
                this.displayCallback({
                    type: 'thinking_end',
                    content: event.content,
                })
                break
            case 'toolcall_end':
                this.displayCallback({
                    type: 'toolcall',
                    toolName: (event as any).toolCall?.name ?? '',
                    toolArgs: JSON.stringify(
                        (event as any).toolCall?.arguments ?? {},
                    ),
                })
                break
            case 'done': {
                const msg = (event as any).message as
                    | AssistantMessage
                    | undefined
                if (msg?.usage) {
                    this.displayCallback({
                        type: 'done',
                        usage: {
                            input: msg.usage.input,
                            output: msg.usage.output,
                            total: msg.usage.totalTokens ?? 0,
                            cacheRead: msg.usage.cacheRead,
                            cacheWrite: msg.usage.cacheWrite,
                            cacheWrite1h: msg.usage.cacheWrite1h,
                            reasoning: msg.usage.reasoning,
                        },
                    })
                }
                break
            }
            case 'error': {
                const err = (event as any).error as AssistantMessage | undefined
                this.displayCallback({
                    type: 'error',
                    error: err?.errorMessage ?? 'Unknown error',
                })
                break
            }
            case 'start':
                break
        }
    }
}

// ── 辅助：从 Pi Models 查找模型对象 ──

/** 从 provider/modelId 字符串创建 Pi AgentTool（适配） */
export function customToolToAgentTool(tool: {
    def: {
        type: 'function'
        function: {
            name: string
            description: string
            parameters: Record<string, unknown>
        }
    }
    command: string[]
}): AgentTool<any> {
    return {
        name: tool.def.function.name,
        description: tool.def.function.description,
        parameters: tool.def.function.parameters,
        execute: async (args: unknown) => {
            const cmd = tool.command
                .map((part) => {
                    const match = part.match(/^\$\{([^}]+)\}$/)
                    if (match && args && typeof args === 'object') {
                        return String(
                            (args as Record<string, unknown>)[match[1]] ?? '',
                        )
                    }
                    return part
                })
                .join(' ')

            const proc = Bun.spawn(['sh', '-c', cmd], {
                stdout: 'pipe',
                stderr: 'pipe',
            })
            const output = await new Response(proc.stdout).text()
            const exitCode = await proc.exited
            if (exitCode !== 0) {
                const errText = await new Response(proc.stderr).text()
                return `Error (exit ${exitCode}): ${errText || output}`
            }
            return output
        },
    } as unknown as AgentTool<any>
}
