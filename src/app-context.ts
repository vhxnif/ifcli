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
const settingParse = new AppSettingParse(store.appSetting()!)
const { mcpServers, llmSettings } = settingParse.setting(true)
const chatAction: IChatAction = new ChatAction({ 
    llmClients: llmSettings.map((it) => new OpenAiClient(it)), 
    mcpClients: mcpServers.map((it) => new MCPClient(it)), 
    store
})

export { chatAction, store as chatStore }
