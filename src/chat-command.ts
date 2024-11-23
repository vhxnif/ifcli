#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'
import { editRun, error, println, textColor } from './util/common-utils'

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
    .action(() => chatAction.printChatHistory())

program.command('remove')
    .description('Remove chat by chat number')
    .action(() => chatAction.removeChat())

program.command('change')
    .description('Change to another chat by chat number.')
    .action(() => chatAction.changeChat())

program.command('prompt')
    .description('prompt manager')
    .action(() => {

    })

program.command('config')
    .description('Manage Current Chat Config.')
    .option('-c, --context-size <contextSize>', 'update context size.')
    .option('-m, --model', `change chat model.`)
    .option('-w, --with-context', 'change with context', false)
    .action(async (option) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optFun: Record<string, (str: any) => void> = {
            'contextSize': chatAction.modifyContextSize,
            'model': chatAction.modifyModel,
            'withContext': chatAction.modifyWithContext,
        }
        const opt = Object.entries(option).find(([_, v]) => v)
        if (opt) {
            const [key, value] = opt
            optFun[`${key}`]?.(value)
        }
        chatAction.printChatConfig()
    })

program.command('clear')
    .description('Clear current chat message.')
    .action(() => chatAction.clearChatMessage())

program.configureOutput({
    writeOut: str => textColor(str),
    writeErr: str => error(str)
})

program.parseAsync()
