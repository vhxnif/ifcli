import { ChatAction } from './action/chat-action'
import { AppConfig } from './config/app-config'
import { DeepseekConfig, OllamaConfig, OpenAIConfig, type ILLMConfig } from './config/app-llm-config'
import { AppMCPConfig } from './config/app-mcp-config'
import { OpenAiClient } from './llm/open-ai-client'
import { ChatStore } from './store/chat-store'
import type { IChatAction } from './types/action-types'
import type { IConfig } from './types/config-types'
import type { IChatStore } from './types/store-types'

const config: IConfig = new AppConfig()
const chatStore: IChatStore = new ChatStore(config)

const mcpClients = await new AppMCPConfig(config).clients()
const llmClients = ([new DeepseekConfig(), new OllamaConfig(), new OpenAIConfig()] as ILLMConfig[])
    .filter(it => it.isSet())
    .map(it => (new OpenAiClient({ llmConfig: it, mcpClients })))

const chatAction: IChatAction = new ChatAction(llmClients, chatStore, config)

chatAction.init()

export { chatAction, chatStore }

