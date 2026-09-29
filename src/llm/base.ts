/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 与 @earendil-works/pi-agent-core 的公共入口及 provider/compat 子入口
 * [OUTPUT]: 集中重导出 ifcli 使用的全部 Pi SDK 值与类型
 * [POS]: src/llm/ 的 Pi SDK 边界，所有业务模块必须经此文件访问 Pi，隔离上游 API 变更
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export type {
    AgentEvent,
    AgentMessage,
    AgentTool,
    ThinkingLevel,
} from '@earendil-works/pi-agent-core'
export { Agent, uuidv7 } from '@earendil-works/pi-agent-core'
export type {
    Api,
    AssistantMessage,
    AssistantMessageEvent,
    Context,
    Message,
    Model,
    Models,
    SimpleStreamOptions,
    Static,
    Tool,
    ToolCall,
    ToolResultMessage,
    TSchema,
    UserMessage,
} from '@earendil-works/pi-ai'
export { setBedrockProviderModule } from '@earendil-works/pi-ai/api/bedrock-converse-stream.lazy'
export { bedrockProviderModule } from '@earendil-works/pi-ai/bedrock-provider'
export { streamSimple } from '@earendil-works/pi-ai/compat'
export { builtinModels } from '@earendil-works/pi-ai/providers/all'
