import Database from 'bun:sqlite'
import type { IAct } from './action/action-types'
import { Act } from './action/command-action'
import { Store } from './store/store'
import { chalkThemeColor } from './util/color-schema'
import { appSetting, initAppSetting } from './config/app-setting'
import { dataPath } from './config/data-config'
import { objEnvFill } from './util/platform-utils'

await initAppSetting()
const setting = await appSetting()
objEnvFill(setting)
const store = new Store(new Database(dataPath.database, { strict: true }))
const act: IAct = new Act(store, setting)
const color = chalkThemeColor(setting.generalSetting.theme)

export { act, color }
