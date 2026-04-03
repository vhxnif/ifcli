import type { ChatConfig, ConfigExt } from '../store/store-types'
import { isEmpty, println } from '../util/common-utils'
import { format, statusFormat } from '../util/ui-format'
import type { ChalkChatBoxTheme, ChalkTerminalColor } from './theme/theme-type'

class SimpleShow {
    yes(color: ChalkTerminalColor) {
        return statusFormat.success(color)
    }

    no(color: ChalkTerminalColor) {
        return statusFormat.error(color)
    }

    mcpHealthCheckShow(
        data: {
            name: string
            version: string
            health: boolean
        }[],
        color: ChalkTerminalColor,
    ) {
        println(format.section('MCP Servers Status', color))
        data.forEach((it) => {
            const status = it.health
                ? format.status('success', 'Connected', color)
                : format.status('error', 'Failed', color)
            println(`${color.cyan(`${it.name}@${it.version}`)}: ${status}`)
        })
    }

    mcpTestShow(
        data: {
            name: string
            description: string
        }[],
        theme: ChalkChatBoxTheme,
    ) {
        const { title: titleColor, content } = theme.assisant

        data.forEach((it) => {
            const { name, description } = it
            println(titleColor.bold(name))
            println(content(description))
            println('')
        })
    }

    chatConfigShow(
        chatName: string,
        config: ChatConfig,
        ext: ConfigExt,
        color: ChalkTerminalColor,
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

        println(format.section('Chat Configuration', color))
        println(format.keyValue('Name', chatName, color))
        println(format.keyValue('Provider', llmType, color))
        println(format.keyValue('Model', model, color))
        println(
            format.keyValue(
                'Scenario',
                `${scenarioName} (${color.yellow(scenario)})`,
                color,
            ),
        )
        println(format.keyValue('Context Size', String(contextLimit), color))
        println(
            format.keyValue(
                'Context',
                withContext ? this.yes(color) : this.no(color),
                color,
            ),
        )

        if (isEmpty(mcpServers)) {
            println(format.keyValue('MCP', this.no(color), color))
        } else {
            println(color.cyan.bold('\nMCP Servers:'))
            mcpServers.forEach((it) => {
                println(
                    `  ${color.white('•')} ${color.cyan(`${it.name}@${it.version}`)}`,
                )
            })
        }
    }
}

export const simpleShow = new SimpleShow()
