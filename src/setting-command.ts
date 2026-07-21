#!/usr/bin/env bun
import { pathToFileURL } from 'node:url'
import { Command } from '@commander-js/extra-typings'
import chalk from 'chalk'
import { setting, terminalColor } from './app-context'
import { commanderHelpConfiguration } from './component/theme/color-scheme'
import { APP_VERSION, appSettingCover } from './config/app-setting'
import { dataPath } from './config/data-config'
import { editor, print, println } from './util/common-utils'
import { select } from './util/inquirer-utils'

const program = new Command().configureHelp(
    commanderHelpConfiguration(terminalColor),
)

program
    .name('ifsetting')
    .alias('ist')
    .description('Manage application settings and configuration')
    .version(`${APP_VERSION}`)

// ── config ──

program
    .command('config')
    .alias('cf')
    .description('manage application configuration')
    .option('-m, --modify', 'edit application settings JSON')
    .option('-t, --theme', 'change color theme')
    .option('-s, --thinking-level <level>', 'set default thinking level')
    .action(async ({ modify, theme, thinkingLevel }) => {
        if (modify) {
            const schemaUri = pathToFileURL(dataPath.settingsSchema).href
            const currentJson = JSON.stringify(
                { ...setting, $schema: schemaUri },
                null,
                2,
            )
            const newJson = await editor(currentJson, 'json')
            if (newJson && newJson !== currentJson) {
                const parsed = JSON.parse(newJson) as Record<string, unknown>
                parsed.$schema = './settings-schema.json'
                await appSettingCover(JSON.stringify(parsed, null, 2))
                println(
                    terminalColor.green('Settings updated. Restart to apply.'),
                )
            }
            return
        }

        if (theme) {
            const themes = [
                'Tokyo Night',
                'Tokyo Night Day',
                'Tokyo Night Moon',
                'Tokyo Night Storm',
                'Rose Pine',
                'Rose Pine Moon',
                'Rose Pine Dawn',
                'Catppuccin Latte',
                'Catppuccin Frappe',
                'Catppuccin Macchiato',
                'Catppuccin Mocha',
            ]
            const choice = await select({
                message: 'Select theme:',
                choices: themes.map((t) => ({ name: t, value: t })),
            })
            const updated = {
                ...setting,
                generalSetting: { ...setting.generalSetting, theme: choice },
            }
            await appSettingCover(JSON.stringify(updated, null, 2))
            println(
                terminalColor.green(
                    `Theme changed to: ${choice}. Restart to apply.`,
                ),
            )
            return
        }

        if (thinkingLevel) {
            const levels = [
                'off',
                'minimal',
                'low',
                'medium',
                'high',
                'xhigh',
                'max',
            ]
            if (!levels.includes(thinkingLevel)) {
                println(
                    terminalColor.red(
                        `Invalid thinking level. Valid: ${levels.join(', ')}`,
                    ),
                )
                return
            }
            println(terminalColor.green(`Thinking level: ${thinkingLevel}`))
            // 注意：thinking level 是 per-session 设置，不是全局设置
            println(
                chalk.gray(
                    'Use: ict cf -f <session-id> -t <level> to set per session',
                ),
            )
            return
        }

        // 默认：显示当前配置
        println(chalk.bold('Current Configuration:'))
        println(`  Theme: ${setting.generalSetting.theme}`)
        println(
            `  AutoName: ${setting.session?.autoName?.enabled ? 'enabled' : 'disabled'}`,
        )
        println(
            `  Compaction: ${setting.compaction?.enabled ? 'enabled' : 'disabled'}`,
        )
        if (setting.compaction?.enabled) {
            println(
                `    Trigger: ${setting.compaction.triggerRatio * 100}% of context window`,
            )
            println(
                `    Keep recent: ${setting.compaction.keepRecentRatio * 100}%`,
            )
        }
    })

// ── mcp ──

program
    .command('mcp')
    .description('manage MCP servers')
    .option('-l, --list', 'list configured MCP servers')
    .action(async ({ list }) => {
        if (list) {
            const servers = setting.mcpServers ?? []
            if (servers.length === 0) {
                println(terminalColor.yellow('No MCP servers configured.'))
                return
            }
            for (const s of servers) {
                const status = s.enable
                    ? terminalColor.green('✓')
                    : chalk.gray('✗')
                println(`${status} ${s.name}@${s.version} (${s.type})`)
            }
            return
        }
        // 默认：显示配置建议
        println(chalk.bold('MCP Configuration:'))
        println('  Edit settings JSON to configure MCP servers.')
        println('  Use: ist cf -m to open editor.')
    })

// ── tools ──

program
    .command('tools')
    .alias('ts')
    .description('manage custom tools')
    .option('-l, --list', 'list custom tools')
    .action(async ({ list: listOpt }) => {
        if (listOpt) {
            const tools = setting.customTools ?? []
            if (tools.length === 0) {
                println(terminalColor.yellow('No custom tools configured.'))
                return
            }
            for (const t of tools) {
                println(
                    `${terminalColor.cyan(t.def.function.name)} [${(t.tags ?? []).join(', ')}]`,
                )
                println(`  ${t.def.function.description}`)
            }
            return
        }
        println(chalk.bold('Custom Tools:'))
        println('  Edit settings JSON to configure custom tools.')
        println('  Use: ist cf -m to open editor.')
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(terminalColor.red(message))
})
