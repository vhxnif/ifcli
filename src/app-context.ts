import Database from 'bun:sqlite'
import { ChatAction } from './action/chat-action'
import { SettingAction } from './action/setting-action'
import { AppConfig } from './config/app-config'
import { AppSettingParse } from './config/app-setting'
import { OpenAiClient } from './llm/open-ai-client'
import { Store } from './store/store'
import type { IChatAction, ISettingAction } from './types/action-types'
import type { IConfig } from './types/config-types'
import MCPClient from './types/mcp-client'
import type { IStore } from './types/store-types'
import { themes } from './util/theme'
import {
    catppuccinColorSchema,
    chalkColor,
    displaySchema,
} from './util/color-schema'

const config: IConfig = new AppConfig()
const db = new Database(config.dataPath(), { strict: true })
const store: IStore = new Store(db)
// setting
const settingAction: ISettingAction = new SettingAction(store)
const settingParse = new AppSettingParse(store.appSetting()!)
const { generalSetting, mcpServers, llmSettings } = settingParse.setting(true)

// theme
const { palette } = themes[generalSetting.theme]
const color = chalkColor(catppuccinColorSchema[palette])
const display = displaySchema(color)

// command action
const chatAction: IChatAction = new ChatAction({
    generalSetting,
    llmClients: llmSettings.map((it) => new OpenAiClient(it)),
    mcpClients: mcpServers.map((it) => new MCPClient(it)),
    store,
})

export {
    settingAction,
    chatAction,
    store as chatStore,
    db,
    generalSetting,
    color,
    display,
}
