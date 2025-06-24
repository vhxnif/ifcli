#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { chatAction, color, display } from './app-context'
import { version } from './config/app-setting'
import { editor, print, stdin } from './util/common-utils'

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
    .name('ifchat')
    .alias('ict')
    .description('ifcli chat with LLM')
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
    .command('list')
    .alias('ls')
    .description('list all chats')
    .option('-t, --topic', 'list all topics')
    .action(async ({ topic }) => {
        if (topic) {
            await chatAction.printTopics()
            return
        }
        await chatAction.printChats()
    })

program
    .command('history')
    .alias('hs')
    .description('view chat history')
    .option('-l, --limit <limit>', 'history message limit', '100')
    .option('-e, --exp', 'export history in current dir')
    .action(async ({ limit, exp }) =>
        chatAction.printChatHistory(Number(limit), exp)
    )

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
    .action(async ({ topic }) => {
        if (topic) {
            await chatAction.changeTopic()
            return
        }
        await chatAction.changeChat()
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

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(display.error(message))
})
