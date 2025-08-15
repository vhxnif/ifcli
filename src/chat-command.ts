#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction, color, display } from './app-context'
import { version } from './config/app-setting'
import { editor, print, stdin } from './util/common-utils'
import { commanderHelpConfiguration } from './util/color-schema'

const program = new Command().configureHelp(commanderHelpConfiguration(color))

program
    .name('ifchat')
    .alias('ict')
    .description('chat management')
    .version(`${version}`)

program
    .command('new')
    .description('new chat')
    .argument('<string>')
    .action(async (content) => await chatAction.newChat(content))

program
    .command('ask')
    .description('chat with AI')
    .option('-s, --sync-call', 'sync call')
    .option('-c, --chat-name <string>', 'ask with other chat')
    .option('-e, --edit', 'use editor')
    .option('-t, --new-topic', 'start new topic')
    .argument('[string]')
    .action(async (content, { chatName, edit, syncCall, newTopic }) => {
        const ask = async (ct: string) =>
            await chatAction.ask({
                content: ct,
                chatName,
                noStream: syncCall ? true : false,
                newTopic,
            })
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
    .command('history')
    .alias('hs')
    .description('view chat history')
    .option('-l, --limit <limit>', 'history message limit', '100')
    .action(async ({ limit }) => chatAction.printChatHistory(Number(limit)))

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
    .action(async ({ query, modify, cover, publish }) => {
        if (query) {
            await chatAction.selectPrompt(query)
            return
        }
        if (modify) {
            await editor(chatAction.prompt()).then((text) => {
                if (text) {
                    chatAction.modifySystemPrompt(text)
                }
            })
            return
        }
        if (typeof cover === 'boolean') {
            const str = await stdin()
            if (typeof str === 'string') {
                chatAction.modifySystemPrompt(str.trim())
            }
            return
        }
        if (typeof cover === 'string') {
            chatAction.modifySystemPrompt(cover)
            return
        }
        if (publish) {
            await chatAction.publishPrompt()
            return
        }
        chatAction.printPrompt()
    })

program
    .command('preset')
    .alias('ps')
    .description('preset message manager')
    .option('-e, --edit', 'edit preset message')
    .option('-c, --clear', 'clear preset message')
    .action(async ({ edit, clear }) => {
        if (clear) {
            chatAction.clearPresetMessage()
            return
        }
        if (edit) {
            await chatAction.editPresetMessage()
        }
        chatAction.printPresetMessage()
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
        async ({ contextSize, model, withContext, withMcp, useScenario }) => {
            if (contextSize) {
                chatAction.modifyContextSize(Number(contextSize))
            }
            if (model) {
                await chatAction.modifyModel()
            }
            if (withContext) {
                chatAction.modifyWithContext()
            }
            if (withMcp) {
                chatAction.modifyWithMCP()
            }
            if (useScenario) {
                await chatAction.modifyScenario()
            }
            chatAction.printChatConfig()
        }
    )

program
    .command('export')
    .alias('exp')
    .description('export chat message.')
    .option('-a, --all', 'export all chat messages.')
    .option('-c, --chat', 'select chat and export all topic messages.')
    .option('-t, --topic', 'select chat and topic then export topic messages.')
    .action(async ({ all, chat, topic }) => {
        if (all) {
            await chatAction.exportAllChatMessage()
            return
        }
        if (chat) {
            await chatAction.exportChatMessage()
            return
        }
        if (topic) {
            await chatAction.exportChatTopicMessage()
            return
        }
        await chatAction.exportTopicMessage()
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(display.error(message))
})
