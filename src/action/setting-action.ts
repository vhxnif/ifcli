import { color } from '../app-context'
import { appSetting, appSettingCover } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'
import { editor, isTextSame, jsonformat, objToJson } from '../util/common-utils'
import { select, themeStyle } from '../util/inquirer-utils'
import { themes } from '../util/theme'
import type { ISettingAct } from './action-types'

export class SettingAct implements ISettingAct {
    constructor() {}

    async theme(): Promise<void> {
        const setting = await appSetting()
        const value = await select({
            message: 'Select Theme:',
            choices: Object.keys(themes).map((it) => ({
                name: it,
                value: it,
                description: themes[it].palette,
            })),
            default: setting.generalSetting.theme,
            theme: themeStyle(color),
        })

        setting.generalSetting.theme = value
        await appSettingCover(objToJson(setting))
    }

    async setting(): Promise<void> {
        const setting = await appSetting()
        const sourceText = objToJson(setting)
        const text = await editor(sourceText, 'json')
        if (!text) {
            return
        }
        const fmtText = jsonformat(text)
        if (isTextSame(sourceText, fmtText)) {
            throw Error(promptMessage.noEdit)
        }
        await appSettingCover(fmtText)
    }
}
