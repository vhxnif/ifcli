import Database from 'bun:sqlite'
import { ChatAction } from './action/chat-action'
import { SettingAction } from './action/setting-action'
import { AppConfig } from './config/app-config'
import type { IChatAction, ISettingAction } from './action/action-types'
import type { IDBClient } from './store/store-types'
import { themes } from './util/theme'
import { catppuccinColorSchema, chalkColor } from './util/color-schema'
import { DBClient } from './store/db-client'
import { Store } from './store/store'

const { dataPath } = new AppConfig()
const database = new Database(dataPath(), { strict: true })
const client: IDBClient = new DBClient(database)
const store = new Store(client)
const settingAction: ISettingAction = new SettingAction(store)
const chatAction: IChatAction = new ChatAction(store)
// theme
const { palette } = themes[settingAction.generalSetting.theme]
const color = chalkColor(catppuccinColorSchema[palette])

export { settingAction, chatAction, color }
