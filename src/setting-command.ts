#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { act, terminalColor } from './app-context'
import { APP_VERSION } from './config/app-setting'
import { matchRun, print } from './util/common-utils'
import { commanderHelpConfiguration } from './component/theme/color-schema'

const program = new Command().configureHelp(
    commanderHelpConfiguration(terminalColor)
)

program
    .name('ifsetting')
    .alias('ist')
    .description('Manage application settings and configuration')
    .version(`${APP_VERSION}`)

program
    .command('config')
    .alias('cf')
    .description('manage application configuration')
    .option('-m, --modify', 'edit application settings')
    .option('-t, --theme', 'change color theme')
    .action(async ({ modify, theme }) => {
        const cf = act.setting.config
        await matchRun([
            [modify, cf.modify],
            [theme, cf.theme],
        ])
    })

program
    .command('mcp')
    .description('manage MCP (Model Context Protocol) servers')
    .option('-l, --list', 'list configured MCP servers')
    .option('-t, --test', 'test MCP server connectivity')
    .action(async ({ list, test }) => {
        const tools = act.setting.mcp.tools
        await matchRun([
            [list, tools.list],
            [test, tools.test],
        ])
    })

program
    .command('prompt')
    .alias('pt')
    .description('manage system prompts library')
    .option('-l, --list [name]', 'list prompts (optionally filter by name)')
    .option('-e, --export', 'export prompts to files')
    .option('-i, --import <file>', 'import prompt from file')
    .option('-d, --delete [name]', 'delete prompt (optionally specify name)')
    .action(async ({ list, export: exp, import: imp, delete: del }) => {
        const pt = act.setting.prompt
        const listRun = async () => {
            if (typeof list === 'string') {
                await pt.list(list)
                return
            }
            await pt.list()
        }
        const deleteRun = async () => {
            if (typeof del === 'string') {
                await pt.delete(del)
                return
            }
            await pt.delete()
        }
        await matchRun([
            [list, listRun],
            [del, deleteRun],
            [exp, pt.export],
            [imp, async () => await pt.import(imp!)],
        ])
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(terminalColor.red(message))
})
