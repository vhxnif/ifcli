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
    .description('setting management')
    .version(`${APP_VERSION}`)

program
    .command('config')
    .alias('cf')
    .description('config management')
    .option('-m, --modify', 'modify app config')
    .option('-t, --theme', 'change theme')
    .option('-e, --exp', 'export app config')
    .option('-i, --imp <file>', 'import app config')
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
    .description('mcp server management')
    .option('-l, --list', 'list mcp server')
    .option('-t, --test', 'test mcp server')
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
    .description('system prompt management')
    .option('-l, --list [name]', 'list mcp server')
    .option('-e, --exp', 'export system prompt')
    .option('-i, --imp <file>', 'import system prompt')
    .action(async ({ list, exp, imp }) => {
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
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(color.red(message))
})
