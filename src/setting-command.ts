#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction, color, display, settingAction } from './app-context'
import { version } from './config/app-setting'
import { print } from './util/common-utils'

const program = new Command()

program.configureHelp({
    styleTitle: (str) => color.peach.bold(str),
    styleCommandText: (str) => color.sky(str),
    styleCommandDescription: (str) => color.green.bold.italic(str),
    styleDescriptionText: (str) => color.flamingo.italic(str),
    styleOptionText: (str) => color.green(str),
    styleArgumentText: (str) => color.pink(str),
    styleSubcommandText: (str) => color.sapphire.italic(str),
    styleOptionTerm: (str) => color.mauve.italic(str),
})

program
    .name('ifsetting')
    .alias('ist')
    .description('ifcli setting')
    .version(`${version}`)

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
    print(display.error(message))
})
