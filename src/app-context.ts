import Database from 'bun:sqlite'
import { ChatAction } from './action/chat-action'
import { SettingAction } from './action/setting-action'
import { AppConfig } from './config/app-config'
import { AppSettingParse } from './config/app-setting'
import { OpenAiClient } from './llm/open-ai-client'
import { ChatStore } from './store/chat-store'
import type { IChatAction, ISettingAction } from './types/action-types'
import type { IConfig } from './types/config-types'
import MCPClient from './types/mcp-client'
import type { IChatStore } from './types/store-types'

const config: IConfig = new AppConfig()
const db = new Database(config.dataPath(), { strict: true })
const store: IChatStore = new ChatStore(db)
const settingAction: ISettingAction = new SettingAction(store)
const settingParse = new AppSettingParse(store.appSetting()!)
const { generalSetting, mcpServers, llmSettings } = settingParse.setting(true)
const chatAction: IChatAction = new ChatAction({
    generalSetting,
    llmClients: llmSettings.map((it) => new OpenAiClient(it)),
    mcpClients: mcpServers.map((it) => new MCPClient(it)),
    store,
})

export { settingAction, chatAction, store as chatStore, db }
