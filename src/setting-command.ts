#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction, color, settingAction } from './app-context'
import { APP_VERSION } from './config/app-setting'
import { print } from './util/common-utils'
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
        if (modify) {
            await settingAction.setting()
            return
        }
        if (theme) {
            await settingAction.theme()
            return
        }
        if (exp) {
            await settingAction.exportSetting()
            return
        }
        if (imp) {
            await settingAction.importSetting(imp)
            return
        }
    })

program
    .command('mcp')
    .description('manage MCP (Model Context Protocol) servers')
    .option('-l, --list', 'list configured MCP servers')
    .option('-t, --test', 'test MCP server connectivity')
    .action(async ({ list, test }) => {
        if (list) {
            await chatAction.tools()
            return
        }
        if (test) {
            await chatAction.testTool()
            return
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
        if (list) {
            if (typeof list === 'string') {
                await chatAction.listPrompt(list)
                return
            }
            await chatAction.listPrompt()
            return
        }
        if (exp) {
            await chatAction.exportPrompt()
            return
        }
        if (imp) {
            await chatAction.importPrompt(imp)
            return
        }
        if (del) {
            if (typeof del === 'string') {
                await chatAction.deletePrompt(del)
                return
            }
            await chatAction.deletePrompt()
            return
        }
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(color.red(message))
})
