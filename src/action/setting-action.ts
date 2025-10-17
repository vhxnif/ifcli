import { terminalColor } from '../app-context'
import { schemas } from '../component/theme/color-schema'
import { appSetting, appSettingCover } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'
import { editor, isTextSame, jsonformat, objToJson } from '../util/common-utils'
import { select, selectThemeStyle } from '../util/inquirer-utils'
import { objEnvCheck } from '../util/platform-utils'
import type { ISettingAct } from './action-types'

export class SettingAct implements ISettingAct {
    constructor() {}

    async theme(): Promise<void> {
        const setting = await appSetting()
        const value = await select({
            message: 'Select Theme:',
            choices: schemas.map((it) => ({
                name: it.name,
                value: it.name,
            })),
            default: setting.generalSetting.theme,
            theme: selectThemeStyle(terminalColor),
        })

        setting.generalSetting.theme = value
        await appSettingCover(objToJson(setting))
    }

    async modify(): Promise<void> {
        const setting = await appSetting()
        const sourceText = objToJson(setting)
        const text = await editor(sourceText, 'json')
        if (!text) {
            return
        }
        objEnvCheck(JSON.parse(text))
        const fmtText = jsonformat(text)
        if (isTextSame(sourceText, fmtText)) {
            throw Error(promptMessage.noEdit)
        }
        await appSettingCover(fmtText)
    }
}
