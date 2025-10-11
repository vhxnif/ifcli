import Database from 'bun:sqlite'
import type { IAct } from './action/action-types'
import { Act } from './action/command-action'
import { DataPathConfig } from './config/data-config'
import { Store } from './store/store'
import { chalkThemeColor } from './util/color-schema'

const { databasePath } = new DataPathConfig()
const store = new Store(new Database(databasePath, { strict: true }))
const act: IAct = new Act(store)
const color = chalkThemeColor(act.setting.config.general().theme)

export { act, color }
