import { color } from '../app-context'
import { AppSettingParse, type GeneralSetting } from '../config/app-setting'
import { promptMessage } from '../config/prompt-message'
import type { ISettingAction } from './action-types'
import type { IChatStore } from '../store/store-types'
import { editor, isTextSame } from '../util/common-utils'
import { select, themeStyle, type Choice } from '../util/inquirer-utils'
import { themes } from '../util/theme'

export class SettingAction implements ISettingAction {
    private readonly store: IChatStore
    constructor(store: IChatStore) {
        this.store = store
    }

    theme = async () => {
        const st = this.store.appSetting.get()!
        const parse = new AppSettingParse(st)
        const generalSetting: GeneralSetting = parse.generalSetting()
        await this.updateGeneralSetting({
            message: 'Select Theme:',
            choices: Object.keys(themes).map((it) => ({
                name: it,
                value: it,
                description: themes[it].palette,
            })),
            df: generalSetting.theme,
            f: (v) => ({ theme: v }),
        })
    }

    private updateGeneralSetting = async ({
        message,
        choices,
        df,
        f,
    }: {
        message: string
        choices: Choice<string>[]
        df?: string
        f: (value: string) => {
            [K in keyof GeneralSetting]?: GeneralSetting[K]
        }
    }) => {
        const { get, set } = this.store.appSetting
        const st = get()!
        const parse = new AppSettingParse(st)
        const generalSetting: GeneralSetting = parse.generalSetting()
        const value = await select({
            message,
            choices,
            default: df,
            theme: themeStyle(color),
        })
        const newSetting = parse.generalSettingParse({
            ...generalSetting,
            ...f(value),
        })
        set({
            ...st,
            generalSetting: newSetting,
        })
    }

    setting = async () => {
        const text = async (source: string) => await editor(source, 'json')
        await this.modifySetting(text)
    }

    private modifySetting = async (
        mdf: (source: string) => Promise<string>
    ) => {
        const { get, set } = this.store.appSetting
        const st = get()!
        const parse = new AppSettingParse(st)
        const sourceText = parse.editShow()
        const text = await mdf(sourceText)
        if (!text) {
            return
        }
        if (isTextSame(sourceText, text)) {
            throw Error(promptMessage.noEdit)
        }
        const setting = parse.editSettingParse(text)
        if (!setting) {
            return
        }
        if (isTextSame(sourceText, parse.editShow(setting))) {
            throw Error(promptMessage.noEdit)
        }
        const add = parse.editParse(setting)
        if (!add) {
            return
        }
        set(add)
    }

    importSetting = async (file: string) => {
        const text = async () => await Bun.file(file).text()
        await this.modifySetting(text)
    }

    exportSetting = async () => {
        const parse = new AppSettingParse(this.store.appSetting.get()!)
        const sourceText = parse.editShow()
        await Bun.write(`ifcli_setting.json`, sourceText)
    }

    get generalSetting(): GeneralSetting {
        const st = this.store.appSetting.get()!
        const parse = new AppSettingParse(st)
        return parse.generalSetting()
    }
}
