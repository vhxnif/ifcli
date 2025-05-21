import { AppSettingParse, type GeneralSetting } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'
import { themes } from '../llm/theme'
import type { ISettingAction } from '../types/action-types'
import type { IChatStore } from '../types/store-types'
import { editor, isTextSame } from '../util/common-utils'
import { selectRun, type Choice } from '../util/inquirer-utils'

export class SettingAction implements ISettingAction {
    private readonly store: IChatStore
    constructor(store: IChatStore) {
        this.store = store
    }

    theme = async () => {
        await this.updateGeneralSetting(
            'Select Theme:',
            Object.keys(themes).map((it) => ({
                name: it,
                value: it,
            })),
            (v) => ({ theme: v })
        )
    }

    private updateGeneralSetting = async (
        message: string,
        choices: Choice[],
        f: (value: string) => {
            [K in keyof GeneralSetting]?: GeneralSetting[K]
        }
    ) => {
        const st = this.store.appSetting()!
        const parse = new AppSettingParse(st)
        const generalSetting: GeneralSetting = parse.generalSetting()
        await selectRun(message, choices, (value) => {
            const newSetting = parse.generalSettingParse({
                ...generalSetting,
                ...f(value),
            })
            this.store.addAppSetting({
                ...st,
                generalSetting: newSetting,
            })
        })
    }

    setting = async () => {
        const st = this.store.appSetting()!
        const parse = new AppSettingParse(st)
        const sourceText = parse.editShow()
        const text = await editor(sourceText, 'json')
        if (!text) {
            return
        }
        if (isTextSame(sourceText, text)) {
            throw Error(promptMessage.noEdit)
        }
        const add = parse.editParse(text)
        if (!add) {
            return
        }
        this.store.addAppSetting(add)
    }
}
