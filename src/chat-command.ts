#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'

const program = new Command()

program
    .name('chat')
    .description('ask AI')
    .version('0.1.0')

program.command('init')
    .action(() => chatAction.init())

program.command('new')
    .description('new chat')
    .argument('<string>')
    .action((content) => chatAction.newChat(content))

program.command('ask')
    .description('talk with agent')
    .argument('<string>')
    .action(async (content) => await chatAction.ask(content))

program.command('list')
    .description('list all chats')
    .action(() => chatAction.printChats())

program.command('history')
    .description('history questions')
    .action(() => chatAction.printChatHistory())

program.command('remove')
    .description('remove chat')
    .action(() => chatAction.removeChat())

program.command('change')
    .description('change to another chat')
    .action(() => chatAction.changeChat())

program.command('prompt')
    .description('prompt manager')
    .option('-s, --select <name>', 'select a prompt for the current chat')
    .option('-m, --modify <prompt>', 'modify the current chat\'s prompt')
    .option('-p, --publish', 'publish the current chat prompt')
    .action((option) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optFun: Record<string, (str: any) => void> = {
            'select': chatAction.selectPrompt,
            'modify': chatAction.modifySystemPrompt,
            'publish': chatAction.publishPrompt,
        }
        const opt = Object.entries(option).find(([_, v]) => v)
        if (opt) {
            const [key, value] = opt
            optFun[`${key}`]?.(value)
        }
    })

program.command('config')
    .description('manage current chat configuration')
    .option('-c, --context-size <contextSize>', 'update context size')
    .option('-m, --model', `change chat model`)
    .option('-w, --with-context', 'change with-context', false)
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
    .description('clear the current chat message')
    .action(() => chatAction.clearChatMessage())

program.parseAsync()
