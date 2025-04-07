import { ChatAction } from './action/chat-action'
import { AppConfig } from './config/app-config'
import { AppSettingParse } from './config/app-setting'
import { OpenAiClient } from './llm/open-ai-client'
import { ChatStore } from './store/chat-store'
import type { IChatAction } from './types/action-types'
import type { IConfig } from './types/config-types'
import MCPClient from './types/mcp-client'
import type { IChatStore } from './types/store-types'

const config: IConfig = new AppConfig()
const store: IChatStore = new ChatStore(config)
store.init()

const st = store.appSetting()!
const settingParse = new AppSettingParse(st)
const { mcpServers, llmSettings } = settingParse.setting(true)
const mcpClients = mcpServers.map((it) => new MCPClient(it))
const llmClients = llmSettings.map(
    (it) => new OpenAiClient({ llmConfig: it, mcpClients })
)
const chatAction: IChatAction = new ChatAction(llmClients, store, config)
export { chatAction, store as chatStore }
