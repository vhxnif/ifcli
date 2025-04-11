import { AppSettingParse } from "../config/app-setting"
import type { ISettingAction } from "../types/action-types"
import type { IChatStore } from "../types/store-types"
import { editor, error, isTextSame } from "../util/common-utils"

export class SettingAction implements ISettingAction {

    private readonly store: IChatStore
    constructor(store: IChatStore) {
        this.store = store
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
            error('Setting Not Change.')
            return
        }
        const add = parse.editParse(text)
        if (!add) {
            return
        }
        this.store.addAppSetting(add)
    }

}