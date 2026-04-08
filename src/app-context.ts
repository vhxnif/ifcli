import Database from 'bun:sqlite'
import type { IAct } from './action/action-types'
import { Act } from './action/command-action'
import {
    chalkColor,
    getSemanticColors,
    getSpinnerName,
} from './component/theme/color-scheme'
import type {
    SpinnerName,
    ThemeSemanticColors,
} from './component/theme/theme-type'
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
const semanticColors: ThemeSemanticColors = getSemanticColors(colorScheme)
const spinnerName: SpinnerName = getSpinnerName(colorScheme)

export { act, chalkTheme, semanticColors, spinnerName, terminalColor }
