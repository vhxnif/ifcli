#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { cmdAct, color } from './app-context'
import { APP_VERSION } from './config/app-setting'
import { commanderHelpConfiguration } from './util/color-schema'
import { editor, isEmpty, print, stdin } from './util/common-utils'

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
        const { run, reRun } = cmdAct.chat.ask
        const ask = async (ct: string) => {
            let str = ct
            if (attachment) {
                const fileContent = await Bun.file(attachment).text()
                str = `# User\n\n${ct}\n\n# Attachment \n\n${fileContent}`
            }
            await run({
                content: str,
                chatName: force,
                noStream: syncCall ? true : false,
                newTopic,
            })
        }
        const getContentAndAsk = async (
            f: () => Promise<string | undefined>
        ) => {
            const text = await f()
            if (text) {
                await ask(text)
            }
        }
        switch (true) {
            case retry:
                await reRun()
                break
            case !isEmpty(content):
                await ask(content!)
                break
            case edit:
                await getContentAndAsk(async () => await editor(''))
                break
            default:
                await getContentAndAsk(stdin)
        }
    })

program
    .command('new')
    .description('create a new chat session')
    .argument('<name>', 'name for the new chat session')
    .action(async (content) => await cmdAct.chat.new(content))

program
    .command('history')
    .alias('hs')
    .description('view chat conversation history')
    .option(
        '-l, --limit <number>',
        'maximum number of messages to display',
        '100'
    )
    .action(async ({ limit }, cmd) => {
        const force = cmd.parent?.opts()?.force as string
        await cmdAct.chat.msgHistory(Number(limit), force)
    })

program
    .command('remove')
    .alias('rm')
    .description('delete a chat session')
    .action(async () => await cmdAct.chat.remove())

program
    .command('switch')
    .alias('st')
    .description('switch between chat sessions or topics')
    .option('-t, --topic', 'switch to a different topic')
    .argument('[name]', 'target chat session name')
    .action(async (name, { topic }) => {
        const { chat, topic: cgTopic } = cmdAct.chat.switch
        if (topic) {
            await cgTopic()
            return
        }
        await chat(name)
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
        const { list, get, set, show, publish: ps } = cmdAct.chat.prompt
        const modifyRun = async () => {
            await editor(get(name)).then((text) => {
                if (text) {
                    set(text, name)
                }
            })
        }
        const coverStdinRun = async () => {
            const str = await stdin()
            if (typeof str === 'string') {
                set(str.trim(), name)
            }
        }
        switch (true) {
            case !isEmpty(query):
                await list(query!, name)
                break
            case modify:
                await modifyRun()
                break
            case typeof cover === 'boolean':
                await coverStdinRun()
                break
            case typeof cover === 'string':
                set(cover, name)
                break
            case publish:
                await ps(name)
                break
            default:
                show(name)
        }
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
        const preset = cmdAct.chat.preset
        switch (true) {
            case edit:
                await preset.edit(name)
                break
            case clear:
                preset.clear(name)
                break
            default:
                preset.show(name)
        }
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
            const cf = cmdAct.chat.config
            switch (true) {
                case !isEmpty(contextSize):
                    cf.contextSize(Number(contextSize), name)
                    break
                case model:
                    await cf.model(name)
                    break
                case withContext:
                    cf.context(name)
                    break
                case withMcp:
                    await cf.mcp(name)
                    break
                case useScenario:
                    await cf.scenario(name)
                    break
                default:
                    cf.show(name)
            }
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
        const exp = cmdAct.chat.export
        switch (true) {
            case all:
                await exp.all(path)
                break
            case chat:
                await exp.chat(path)
                break
            case topic:
                await exp.chatTopic(path)
                break
            default:
                await exp.topic(path)
        }
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(color.red(message))
})
