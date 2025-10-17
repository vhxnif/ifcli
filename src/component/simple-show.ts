import type { ChatConfig, ConfigExt } from '../store/store-types'
import { isEmpty, println } from '../util/common-utils'
import { TextShow } from './text-show'
import type { ChalkChatBoxTheme, ChalkTerminalColor } from './theme/theme-type'

class SimpleShow {
    constructor() {}

    yes(color: ChalkTerminalColor) {
        return color.green.bold('✓')
    }

    no(color: ChalkTerminalColor) {
        return color.red.bold('✗')
    }

    mcpHealthCheckShow(
        data: {
            name: string
            version: string
            health: boolean
        }[],
        color: ChalkTerminalColor
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
        theme: ChalkChatBoxTheme
    ) {
        const { title: titleColor, bolder, content } = theme.assisant

        data.forEach((it) => {
            const { name, description } = it
            const ts = new TextShow({
                title: name,
                titleColor: titleColor,
                bolderColor: bolder,
                textColor: content,
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
        color: ChalkTerminalColor
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
        const { yellow, cyan } = color
        const arr = [
            { key: 'Chat Name', value: cyan(chatName) },
            { key: 'Provider', value: cyan(llmType) },
            { key: 'Model', value: cyan(model) },
            {
                key: 'Scenario',
                value: `${cyan(scenarioName)}(${yellow(scenario)})`,
            },
            {
                key: 'Context Size',
                value: `${color.yellow(contextLimit)}`,
            },
            {
                key: 'Context',
                value: withContext ? this.yes(color) : this.no(color),
            },
            {
                key: 'MCP',
                value: isEmpty(mcpServers)
                    ? this.no(color)
                    : cyan(
                          `\n${mcpServers.map(
                              (it) => `  ${it.name}@${it.version}`
                          )}`
                      ),
            },
        ]
        arr.forEach((it) => println(`${it.key}: ${it.value}`))
    }
}

export const simpleShow = new SimpleShow()
