import Database from 'bun:sqlite'
import { ChatAction } from './action/chat-action'
import { SettingAction } from './action/setting-action'
import { AppConfig } from './config/app-config'
import type { IChatAction, ISettingAction } from './action/action-types'
import type { IDBClient } from './store/store-types'
import { themes } from './util/theme'
import {
    catppuccinColorSchema,
    chalkColor,
    displaySchema,
} from './util/color-schema'
import { DBClient } from './store/db-client'
import { ChatStore } from './store/chat-store'

const { dataPath } = new AppConfig()
const dbClient: IDBClient = new DBClient(
    new Database(dataPath(), { strict: true })
)
// setting
const settingAction: ISettingAction = new SettingAction(new ChatStore(dbClient))
// command action
const chatAction: IChatAction = new ChatAction(new ChatStore(dbClient))

// theme
const { palette } = themes[settingAction.generalSetting.theme]
const color = chalkColor(catppuccinColorSchema[palette])
const display = displaySchema(color)

export { settingAction, chatAction, color, display }
