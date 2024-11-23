#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'
import { error, println, textColor } from './util/common-utils'

const program = new Command()

program
    .name('chat')
    .description('Ask AI.')
    .version('0.1.0')

program.command('init')
    .action(() => chatAction.init())

program.command('new')
    .description('New Chat')
    .argument('<string>')
    .action((content) => chatAction.newChat(content))

program.command('ask')
    .description('Talk with Agent.')
    .argument('<string>')
    .action(async (content) => await chatAction.ask(content))

program.command('list')
    .description('List all chats.')
    .action(() => chatAction.printChats())

program.command('history')
    .description('History Questions.')
    .action(() => chatAction.printHistory())

program.command('remove')
    .description('Remove chat by chat number')
    .action(() => chatAction.removeChat())

program.command('change')
    .description('Change to another chat by chat number.')
    .action(() => chatAction.changeChat())

program.command('config')
    .description('Manage Current Chat Config.')
    .option('-s, --sys-prompt <sysPrompt>', 'update current system prompt.')
    .option('-c, --context-size <contextSize>', 'update current context size.')
    .option('-m, --model', `change chat model`)
    .option('-w, --with-context', 'change with context', false)
    .action(async (option) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optFun: Record<string, (str: any) => void> = {
            'sysPrompt': chatAction.modifySystemPrompt,
            'contextSize': chatAction.modifyContextSize,
            'model': chatAction.modifyModel,
            'withContext': chatAction.modifyWithContext,
        }
        const opt = Object.entries(option).find(([_, v]) => v)
        if (!opt) {
            chatAction.printCurrentConfig()
            return
        }
        const [key, value] = opt
        const fun = Object.entries(optFun).find(([k, _]) => k === key)
        if (!fun) {
            println(error(`option ${key} not support.`))
            return
        }
        const [_, f] = fun
        f(value.toString())
    })

program.command('clear')
    .description('Clear current chat message.')
    .action(() => chatAction.clearChatMessage())

program.configureOutput({
    writeOut: str => textColor(str),
    writeErr: str => error(str)
})

program.parseAsync()
