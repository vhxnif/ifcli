#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction, color } from './app-context'
import { APP_VERSION } from './config/app-setting'
import { editor, print, stdin } from './util/common-utils'
import { commanderHelpConfiguration } from './util/color-schema'

const program = new Command()
    .configureHelp(commanderHelpConfiguration(color))
    .enablePositionalOptions()

program
    .name('ifchat')
    .alias('ict')
    .version(`${APP_VERSION}`)
    .description('chat with AI')
    .option('-f, --force <name>', 'use the specified chat')
    .option('-s, --sync-call', 'sync call')
    .option('-e, --edit', 'use editor')
    .option('-t, --new-topic', 'start new topic')
    .option('-r, --retry', 'retry the last question')
    .argument('[string]')
    .action(async (content, option) => {
        const { edit, syncCall, newTopic, force, retry } = option
        if (retry) {
            await chatAction.reAsk()
            return
        }
        const ask = async (ct: string) => {
            await chatAction.ask({
                content: ct,
                chatName: force,
                noStream: syncCall ? true : false,
                newTopic,
            })
        }

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
    .command('new')
    .description('new chat')
    .argument('<string>')
    .action(async (content) => await chatAction.newChat(content))

program
    .command('history')
    .alias('hs')
    .description('view chat topic history')
    .option('-l, --limit <limit>', 'history message limit', '100')
    .action(async ({ limit }, cmd) => {
        const force = cmd.parent?.opts()?.force as string
        chatAction.printChatHistory(Number(limit), force)
    })

program
    .command('remove')
    .alias('rm')
    .description('remove chat')
    .action(async () => await chatAction.removeChat())

program
    .command('switch')
    .alias('st')
    .description('switch to another chat or topic')
    .option('-t, --topic', 'switch to anther topic')
    .argument('[name]')
    .action(async (name, { topic }) => {
        if (topic) {
            await chatAction.changeTopic()
            return
        }
        await chatAction.changeChat(name)
    })

program
    .command('prompt')
    .alias('pt')
    .description('prompt manager')
    .option('-q, --query <name>', 'query and set prompt for current chat')
    .option('-m, --modify', "modify the current chat's prompt")
    .option('-c, --cover [prompt]', "override the current chat's prompt")
    .option('-p, --publish', 'publish  prompt')
    .action(async ({ query, modify, cover, publish }, cmd) => {
        const name = cmd.parent?.opts().force as string
        if (query) {
            await chatAction.selectPrompt(query, name)
            return
        }
        if (modify) {
            await editor(chatAction.prompt(name)).then((text) => {
                if (text) {
                    chatAction.modifySystemPrompt(text, name)
                }
            })
            return
        }
        if (typeof cover === 'boolean') {
            const str = await stdin()
            if (typeof str === 'string') {
                chatAction.modifySystemPrompt(str.trim(), name)
            }
            return
        }
        if (typeof cover === 'string') {
            chatAction.modifySystemPrompt(cover, name)
            return
        }
        if (publish) {
            await chatAction.publishPrompt(name)
            return
        }
        chatAction.printPrompt(name)
    })

program
    .command('preset')
    .alias('ps')
    .description('preset message manager')
    .option('-e, --edit', 'edit preset message')
    .option('-c, --clear', 'clear preset message')
    .action(async (options, cmd) => {
        const { edit, clear } = options
        const name = cmd.parent?.opts().force as string
        if (edit) {
            await chatAction.editPresetMessage(name)
        }
        if (clear) {
            chatAction.clearPresetMessage(name)
            return
        }
        chatAction.printPresetMessage(name)
    })

program
    .command('config')
    .alias('cf')
    .description('manage chat config')
    .option('-c, --context-size <contextSize>', 'update context size')
    .option('-m, --model', `switch model`)
    .option('-o, --with-context', 'change with-context', false)
    .option('-p, --with-mcp', 'change with-mcp', false)
    .option('-u, --use-scenario', 'use scenario')
    .action(
        async (
            { contextSize, model, withContext, withMcp, useScenario },
            cmd
        ) => {
            const name = cmd.parent?.opts().force as string
            if (contextSize) {
                chatAction.modifyContextSize(Number(contextSize), name)
            }
            if (model) {
                await chatAction.modifyModel(name)
            }
            if (withContext) {
                chatAction.modifyWithContext(name)
            }
            if (withMcp) {
                await chatAction.modifyWithMCP(name)
            }
            if (useScenario) {
                await chatAction.modifyScenario(name)
            }
            chatAction.printChatConfig(name)
        }
    )

program
    .command('export')
    .alias('exp')
    .argument('[path]', 'default: $HOME')
    .description('export chat message')
    .option('-a, --all', 'export all chat messages')
    .option('-c, --chat', 'select chat and export all topic messages')
    .option('-t, --topic', 'select chat and topic then export topic messages')
    .action(async (path, { all, chat, topic }) => {
        if (all) {
            await chatAction.exportAllChatMessage(path)
            return
        }
        if (chat) {
            await chatAction.exportChatMessage(path)
            return
        }
        if (topic) {
            await chatAction.exportChatTopicMessage(path)
            return
        }
        await chatAction.exportTopicMessage(path)
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(color.red(message))
})
