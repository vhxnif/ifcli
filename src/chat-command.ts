#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'
import { optionFunMapping } from './util/common-utils'

const program = new Command()

program
    .name('ifct')
    .description('ifcli chat with LLM')
    .version('0.1.0')

program.command('init')
    .description('init chat config')
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
    .action((option) => optionFunMapping(option, {
        'select': v => chatAction.selectPrompt(v as string),
        'modify': v => chatAction.modifySystemPrompt(v as string),
        'publish': chatAction.publishPrompt,
    }))

program.command('config')
    .description('manage current chat configuration')
    .option('-c, --context-size <contextSize>', 'update context size')
    .option('-m, --model', `change chat model`)
    .option('-w, --with-context', 'change with-context', false)
    .option('-s, --scenario', 'select scenario')
    .action(async (option) => {
        optionFunMapping(option, {
            'contextSize': v => chatAction.modifyContextSize(v as number),
            'model': chatAction.modifyModel,
            'withContext': chatAction.modifyWithContext,
            'scenario': chatAction.modifyScenario,
        }, chatAction.printChatConfig)
    })

program.command('clear')
    .description('clear the current chat message')
    .action(() => chatAction.clearChatMessage())

program.parseAsync()
