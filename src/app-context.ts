import Database from 'bun:sqlite'
import type { ICmdAct } from './action/action-types'
import { CmdAct } from './action/command-action'
import { DataPathConfig } from './config/data-config'
import { Store } from './store/store'
import { chalkThemeColor } from './util/color-schema'

const { databasePath } = new DataPathConfig()
const store = new Store(new Database(databasePath, { strict: true }))
const cmdAct: ICmdAct = new CmdAct(store)
const color = chalkThemeColor(cmdAct.setting.config.general().theme)

export { cmdAct, color }
