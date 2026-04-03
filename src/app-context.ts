import Database from 'bun:sqlite'
import type { IAct } from './action/action-types'
import { Act } from './action/command-action'
import { chalkColor } from './component/theme/color-scheme'
import { appSetting, initAppSetting } from './config/app-setting'
import { dataPath } from './config/data-config'
import { Store } from './store/store'
import { objEnvFill } from './util/platform-utils'

await initAppSetting()
const setting = await appSetting()
objEnvFill(setting)
const store = new Store(new Database(dataPath.database, { strict: true }))
const act: IAct = new Act(store, setting)
const { theme: colorScheme } = setting.generalSetting
const [terminalColor, chalkTheme] = chalkColor(colorScheme)

export { act, chalkTheme, terminalColor }
