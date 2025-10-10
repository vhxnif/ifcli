import { isEmpty, println } from '../util/common-utils'
import {
    catppuccinColorSchema,
    hex,
    type CatppuccinColorName,
} from '../util/color-schema'
import type { ChalkInstance } from 'chalk'
import { TextShow } from './text-show'
import type { GeneralSetting } from '../config/app-setting'
import { themes } from '../util/theme'
import type { ChatConfig, ConfigExt } from '../store/store-types'

class ConfigShow {
    constructor() {}

    yes(color: Record<CatppuccinColorName, ChalkInstance>) {
        return color.green.bold('✓')
    }

    no(color: Record<CatppuccinColorName, ChalkInstance>) {
        return color.red.bold('✗')
    }

    mcpHealthCheckShow(
        data: {
            name: string
            version: string
            health: boolean
        }[],
        color: Record<CatppuccinColorName, ChalkInstance>
    ) {
        data.forEach((it) => {
            println(
                `${it.name}@${it.version}: ${
                    it.health ? this.yes(color) : this.no(color)
                }`
            )
        })
    }

    mcpTestShow(
        data: {
            name: string
            description: string
        }[],
        generalSetting: GeneralSetting
    ) {
        const cl = this.textShowColor(generalSetting)
        data.forEach((it) => {
            const { name, description } = it
            const ts = new TextShow({
                title: name,
                ...cl,
            })
            ts.start()
            ts.append(description)
            ts.stop()
        })
    }

    chatConfigShow(
        chatName: string,
        config: ChatConfig,
        ext: ConfigExt,
        color: Record<CatppuccinColorName, ChalkInstance>
    ) {
        const {
            llmType,
            model,
            scenarioName,
            scenario,
            withContext,
            contextLimit,
        } = config
        const { mcpServers } = ext
        const arr = [
            { key: 'Name', value: color.sky(chatName) },
            { key: 'Model', value: color.sky(`${llmType}/${model}`) },
            {
                key: 'Scenario',
                value: `${color.sky(scenarioName)}(${color.yellow(scenario)})`,
            },
            {
                key: 'Context',
                value: withContext
                    ? color.yellow(contextLimit)
                    : this.no(color),
            },
            {
                key: 'MCP',
                value: isEmpty(mcpServers)
                    ? this.no(color)
                    : color.sky(
                          `\n${mcpServers.map(
                              (it) => `  ${it.name}@${it.version}`
                          )}`
                      ),
            },
        ]
        arr.forEach((it) => println(`${it.key}: ${it.value}`))
    }

    private textShowColor(generalSetting: GeneralSetting) {
        const { palette, assistant } = themes[generalSetting.theme]
        const colorSchema = catppuccinColorSchema[palette]
        const c = (color: CatppuccinColorName) => hex(colorSchema[color])
        return {
            titleColor: c(assistant.titleColor),
            bolderColor: c(assistant.bolderColor),
            textColor: c(assistant.textColor),
        }
    }
}

export const configShow = new ConfigShow()
