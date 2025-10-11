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
    .description('Interactive AI chat interface')
    .option('-f, --force <name>', 'use specified chat session')
    .option('-s, --sync-call', 'use synchronous (non-streaming) mode')
    .option('-e, --edit', 'open editor for input')
    .option('-t, --new-topic', 'start a new conversation topic')
    .option('-r, --retry', 'retry the last question')
    .option('-a, --attachment <file>', 'attach file content to message')
    .argument('[string]')
    .action(async (content, option) => {
        const { edit, syncCall, newTopic, force, retry, attachment } = option
        if (retry) {
            await chatAction.reAsk()
            return
        }
        const ask = async (ct: string) => {
            let str = ct
            if (attachment) {
                const fileContent = await Bun.file(attachment).text()
                str = `# User\n\n${ct}\n\n# Attachment \n\n${fileContent}`
            }

            await chatAction.ask({
                content: str,
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
    .description('create a new chat session')
    .argument('<name>', 'name for the new chat session')
    .action(async (content) => await chatAction.newChat(content))

program
    .command('history')
    .alias('hs')
    .description('view chat conversation history')
    .option('-l, --limit <number>', 'maximum number of messages to display', '100')
    .action(async ({ limit }, cmd) => {
        const force = cmd.parent?.opts()?.force as string
        chatAction.printChatHistory(Number(limit), force)
    })

program
    .command('remove')
    .alias('rm')
    .description('delete a chat session')
    .action(async () => await chatAction.removeChat())

program
    .command('switch')
    .alias('st')
    .description('switch between chat sessions or topics')
    .option('-t, --topic', 'switch to a different topic')
    .argument('[name]', 'target chat session name')
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
    .description('manage system prompts')
    .option('-q, --query <name>', 'search and set prompt for current chat')
    .option('-m, --modify', 'edit the current chat prompt')
    .option('-c, --cover [prompt]', 'replace the current chat prompt')
    .option('-p, --publish', 'publish prompt to shared library')
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
    .description('manage preset message templates')
    .option('-e, --edit', 'edit preset messages')
    .option('-c, --clear', 'clear all preset messages')
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
    .description('configure chat settings')
    .option('-c, --context-size <number>', 'set context window size')
    .option('-m, --model', 'switch AI model')
    .option('-o, --with-context', 'enable/disable context memory', false)
    .option('-p, --with-mcp', 'enable/disable MCP tools', false)
    .option('-u, --use-scenario', 'select conversation scenario')
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
    .argument('[path]', 'export directory (default: $HOME)')
    .description('export chat conversations')
    .option('-a, --all', 'export all chat sessions')
    .option('-c, --chat', 'export all topics from selected chat')
    .option('-t, --topic', 'export specific topic from selected chat')
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
