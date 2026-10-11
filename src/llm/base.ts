/**
 * [INPUT]: 依赖 @earendil-works/pi-ai 与 @earendil-works/pi-agent-core 的公共入口，以及 pi-ai 的 /providers/all、/bedrock-provider、/api/*.lazy（各协议实现工厂）子入口
 * [OUTPUT]: 集中重导出 ifcli 使用的全部 Pi SDK 值与类型，含 createProvider/envApiKeyAuth 与各协议工厂（供自定义 provider 注册）
 * [POS]: src/llm/ 的 Pi SDK 边界，所有业务模块必须经此文件访问 Pi，隔离上游 API 变更
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export type {
    AgentEvent,
    AgentMessage,
    AgentTool,
    StreamFn,
    ThinkingLevel,
} from '@earendil-works/pi-agent-core'
export { Agent } from '@earendil-works/pi-agent-core'
export type {
    Api,
    AssistantMessage,
    AssistantMessageEvent,
    Context,
    Message,
    Model,
    Models,
    MutableModels,
    OpenAICompletionsCompat,
    ProviderStreams,
    SimpleStreamOptions,
    Static,
    ThinkingLevelMap,
    Tool,
    ToolCall,
    ToolResultMessage,
    TSchema,
    UserMessage,
} from '@earendil-works/pi-ai'
export { createProvider, envApiKeyAuth, uuidv7 } from '@earendil-works/pi-ai'
export { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy'
export { azureOpenAIResponsesApi } from '@earendil-works/pi-ai/api/azure-openai-responses.lazy'
export {
    bedrockConverseStreamApi,
    setBedrockProviderModule,
} from '@earendil-works/pi-ai/api/bedrock-converse-stream.lazy'
export { googleGenerativeAIApi } from '@earendil-works/pi-ai/api/google-generative-ai.lazy'
export { googleVertexApi } from '@earendil-works/pi-ai/api/google-vertex.lazy'
export { mistralConversationsApi } from '@earendil-works/pi-ai/api/mistral-conversations.lazy'
export { openAICodexResponsesApi } from '@earendil-works/pi-ai/api/openai-codex-responses.lazy'
export { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
export { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy'
export { piMessagesApi } from '@earendil-works/pi-ai/api/pi-messages.lazy'
export { bedrockProviderModule } from '@earendil-works/pi-ai/bedrock-provider'
export { builtinModels } from '@earendil-works/pi-ai/providers/all'
