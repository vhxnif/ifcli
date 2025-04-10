#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction } from './app-context'
import { version } from './config/app-setting'
import { editor, error, stdin } from './util/common-utils'

const program = new Command()

program
    .name('ifct')
    .description('ifcli chat with LLM')
    .version(`${version}`)
    .option('-s, --setting', 'ifcli setting edit')
    .action(async (option) => {
        if (option.setting) {
            await chatAction.setting()
        }
    })

program
    .command('new')
    .description('new chat')
    .argument('<string>')
    .action((content) => chatAction.newChat(content))

program
    .command('ask')
    .description('chat with AI')
    .option('-c, --chat-name <string>', 'ask with other chat')
    .option('-e, --edit', 'use editor')
    .argument('[string]')
    .action(async (content, option) => {
        const { chatName, edit } = option
        const ask = async (ct: string) =>
            await chatAction.ask({ content: ct, chatName })
        if (content) {
            await ask(content)
            return
        }
        const getContentAndAsk = async (
            f: () => Promise<string | undefined>
        ) => {
            const text = await f()
            if (text) {
                await ask(text)
            }
        }
        if (edit) {
            await getContentAndAsk(async () => await editor(''))
            return
        }
        await getContentAndAsk(stdin)
    })

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
    .action(async (option) => {
        const { select, modify, cover, publish } = option
        if (select) {
            await chatAction.selectPrompt(select)
        }
        if (modify) {
            await editor(chatAction.prompt()).then((text) => {
                if (text) {
                    chatAction.modifySystemPrompt(text)
                }
            })
        }
        if (cover) {
            if (typeof cover === 'boolean') {
                const str = await stdin()
                if (str) {
                    chatAction.modifySystemPrompt(str)
                }
                return
            }
            if (typeof cover === 'string') {
                chatAction.modifySystemPrompt(cover)
                return
            }
        }
        if (publish) {
            await chatAction.publishPrompt()
        }
    })

program
    .command('preset')
    .alias('ps')
    .description('preset message manager')
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
    .option('-i, --interactive', 'set interactive-output', false)
    .option('-f, --with-mcp', 'set with-mcp (function call)', false)
    .option('-s, --scenario', 'select scenario')
    .option('-t, --tools', 'list useful tools')
    .action(async (option) => {
        const {
            contextSize,
            model,
            withContext,
            interactive,
            withMcp,
            scenario,
            tools,
        } = option
        if (contextSize) {
            chatAction.modifyContextSize(Number(contextSize))
        }
        if (model) {
            await chatAction.modifyModel()
        }
        if (withContext) {
            chatAction.modifyWithContext()
        }
        if (interactive) {
            chatAction.modifyInteractiveOutput()
        }
        if (withMcp) {
            chatAction.modifyWithMCP()
        }
        if (scenario) {
            await chatAction.modifyScenario()
        }
        if (tools) {
            await chatAction.usefulTools()
        }
        chatAction.printChatConfig()
    })

program
    .command('clear')
    .alias('cl')
    .description('clear the current chat message')
    .action(() => chatAction.clearChatMessage())

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    error(message)
})
