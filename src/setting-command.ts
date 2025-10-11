#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { cmdAct, color } from './app-context'
import { APP_VERSION } from './config/app-setting'
import { isEmpty, print } from './util/common-utils'
import { commanderHelpConfiguration } from './util/color-schema'

const program = new Command().configureHelp(commanderHelpConfiguration(color))

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
    .option('-e, --exp', 'export configuration to file')
    .option('-i, --imp <file>', 'import configuration from file')
    .action(async ({ modify, theme, exp, imp }) => {
        const cf = cmdAct.setting.config
        switch (true) {
            case modify:
                await cf.modify()
                break
            case theme:
                await cf.theme()
                break
            case exp:
                await cf.export()
                break
            case !isEmpty(imp):
                await cf.import(imp!)
                break
        }
    })

program
    .command('mcp')
    .description('manage MCP (Model Context Protocol) servers')
    .option('-l, --list', 'list configured MCP servers')
    .option('-t, --test', 'test MCP server connectivity')
    .action(async ({ list, test }) => {
        const tools = cmdAct.setting.mcp.tools
        switch (true) {
            case list:
                await tools.list()
                break
            case test:
                await tools.test()
                break
        }
    })

program
    .command('prompt')
    .alias('pt')
    .description('manage system prompts library')
    .option('-l, --list [name]', 'list prompts (optionally filter by name)')
    .option('-e, --exp', 'export prompts to files')
    .option('-i, --imp <file>', 'import prompt from file')
    .option('-d, --delete [name]', 'delete prompt (optionally specify name)')
    .action(async ({ list, exp, imp, delete: del }) => {
        const pt = cmdAct.setting.prompt
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
        switch (true) {
            case list:
                await listRun()
                break
            case del:
                await deleteRun()
                break
            case exp:
                await pt.export()
                break
            case !isEmpty(imp):
                await pt.import(imp!)
                break
        }
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(color.red(message))
})
