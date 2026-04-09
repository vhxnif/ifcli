import { terminalColor } from '../app-context'
import { schemes } from '../component/theme/color-scheme'
import { appSetting, appSettingCover } from '../config/app-setting'
import { dataPath } from '../config/data-config'
import { promptMessage } from '../config/prompt-message'
import { validateSetting } from '../config/setting-validator'
import {
    editor,
    injectSchema,
    isTextSame,
    jsonformat,
    objToJson,
    restoreSchema,
} from '../util/common-utils'
import { select, selectThemeStyle } from '../util/inquirer-utils'
import { objEnvCheck } from '../util/platform-utils'
import type { ISettingAct } from './action-types'

export class SettingAct implements ISettingAct {
    async theme(): Promise<void> {
        const setting = await appSetting()
        const value = await select({
            message: 'Select Theme:',
            choices: schemes.map((it) => ({
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
        const contentWithSchema = injectSchema(
            sourceText,
            dataPath.schema.startsWith('/')
                ? `file://${dataPath.schema}`
                : `file:///${dataPath.schema}`,
        )
        const text = await editor(contentWithSchema, 'json')
        if (!text) {
            return
        }
        const parsed = JSON.parse(text) as Record<string, unknown>
        objEnvCheck(parsed)
        restoreSchema(parsed, './ifcli-settings-schema.json')
        const { valid, errors } = validateSetting(parsed)
        if (!valid) {
            throw Error(errors.join('\n'))
        }
        const fmtText = jsonformat(JSON.stringify(parsed))
        const sourceWithoutSchema = jsonformat(sourceText)
        if (isTextSame(sourceWithoutSchema, fmtText)) {
            throw Error(promptMessage.noEdit)
        }
        await appSettingCover(fmtText)
    }
}
