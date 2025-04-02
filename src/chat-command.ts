#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'
import { editor, optionFunMapping, stdin } from './util/common-utils'

const program = new Command()

program.name('ifct').description('ifcli chat with LLM').version('0.1.7')

program
    .command('new')
    .description('new chat')
    .argument('<string>')
    .action((content) => chatAction.newChat(content))

program
    .command('ask')
    .description('chat with AI')
    .argument('<string>')
    .action(async (content) => await chatAction.ask(content))

program
    .command('list')
    .alias('ls')
    .description('list all chats')
    .action(() => chatAction.printChats())

program
    .command('history')
    .alias('hs')
    .description('view chat history')
    .option('-l, --limit <limit>', 'history message limit', '100')
    .action(async (option) => chatAction.printChatHistory(Number(option.limit)))

program
    .command('remove')
    .alias('rm')
    .description('remove chat')
    .action(() => chatAction.removeChat())

program
    .command('switch')
    .alias('st')
    .description('switch to another chat')
    .action(() => chatAction.changeChat())

program
    .command('prompt')
    .alias('pt')
    .description('prompt manager')
    .option('-s, --select <name>', 'select a prompt for the current chat')
    .option('-m, --modify', "modify the current chat's prompt")
    .option('-c, --cover [prompt]', "override the current chat's prompt")
    .option('-p, --publish', 'publish  prompt')
    .action((option) => {
        optionFunMapping(option, {
            select: (v) => chatAction.selectPrompt(v as string),
            modify: async () => {
                const text = await editor(chatAction.prompt())
                if (text) {
                    chatAction.modifySystemPrompt(text)
                }
            },
            cover: async (v) => {
                if (typeof v === 'boolean') {
                    const str = await stdin()
                    if (str) {
                        chatAction.modifySystemPrompt(str)
                    }
                    return
                }
                if (typeof v === 'string') {
                    chatAction.modifySystemPrompt(v)
                    return
                }
            },
            publish: chatAction.publishPrompt,
        })
    })

program
    .command('preset')
    .alias('ps')
    .option('-e, --edit', 'edit preset message')
    .option('-c, --clear', 'clear preset message')
    .action(async (option) => {
        if (option.edit) {
            await chatAction.editPresetMessage()
            return
        }
        if (option.clear) {
            chatAction.clearPresetMessage()
            return
        }
        chatAction.printPresetMessage()
    })

program
    .command('config')
    .alias('cf')
    .description('manage chat config')
    .option('-c, --context-size <contextSize>', 'update context size')
    .option('-m, --model', `switch model`)
    .option('-w, --with-context', 'change with-context', false)
    .option('-s, --scenario', 'select scenario')
    .option('-t, --tools', 'list useful tools')
    .action(async (option) => {
        optionFunMapping(
            option,
            {
                contextSize: (v) => chatAction.modifyContextSize(v as number),
                model: chatAction.modifyModel,
                withContext: chatAction.modifyWithContext,
                scenario: chatAction.modifyScenario,
                tools: chatAction.usefulTools,
            },
            chatAction.printChatConfig
        )
    })

program
    .command('clear')
    .alias('cl')
    .description('clear the current chat message')
    .action(() => chatAction.clearChatMessage())

program.parseAsync()
