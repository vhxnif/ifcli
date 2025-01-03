import { ChatAction } from "./action/chat-action"
import { ToolsAction } from "./action/tools-action"
import { AppConfig } from "./config/app-config"
import { OpenAiClient } from "./llm/open-ai-client"
import { ChatStore } from "./store/chat-store"
import type { IChatAction, IToolsAction } from "./types/action-types"
import type { IConfig } from "./types/config-types"
import type { ILLMClient } from "./types/llm-types"
import type { IChatStore } from "./types/store-types"

const config: IConfig = new AppConfig()

const chatStore: IChatStore = new ChatStore(config)

const client: ILLMClient = new OpenAiClient(config)

const chatAction: IChatAction = new ChatAction(client, chatStore, config)

const toolsAction: IToolsAction = new ToolsAction(client)

export { chatAction, toolsAction, client }
