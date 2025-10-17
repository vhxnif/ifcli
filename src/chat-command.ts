#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { act, terminalColor } from './app-context'
import { APP_VERSION } from './config/app-setting'
import {
    editor,
    isEmpty,
    matchRun,
    parseIntNumber,
    print,
    stdin,
} from './util/common-utils'
import { commanderHelpConfiguration, hex } from './component/theme/color-schema'
const program = new Command()
    .configureHelp(commanderHelpConfiguration(terminalColor))
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
    .option('-a, --attachment <file>', 'attach text file content to message')
    .argument(
        '[string...]',
        'chat message content (multiple arguments will be joined into a single string)'
    )
    .action(async (content, option) => {
        const { edit, syncCall, newTopic, force, retry, attachment } = option
        const { run, reRun } = act.chat.ask
        const withAttachment = async (ct: string) => {
            if (!attachment) {
                return ct
            }
            const fileContent = await Bun.file(attachment).text()
            return `# User\n\n${ct}\n\n# Attachment \n\n${fileContent}`
        }
        const ask = async (ct: string) => {
            await run({
                content: await withAttachment(ct),
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
        const contentRun = async () => await ask(content.join(' ')!)
        const editRun = async () =>
            await getContentAndAsk(async () => await editor(''))
        const stdinRun = async () => await getContentAndAsk(stdin)
        await matchRun([
            [retry, reRun],
            [!isEmpty(content), contentRun],
            [edit, editRun],
            [true, stdinRun],
        ])
    })

program
    .command('new')
    .description('create a new chat session')
    .argument('<name>', 'name for the new chat session')
    .action(async (content) => await act.chat.new(content))

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
        await act.chat.msgHistory(parseIntNumber(limit, 100), force)
    })

program
    .command('remove')
    .alias('rm')
    .description('delete a chat session')
    .action(async () => await act.chat.remove())

program
    .command('switch')
    .alias('st')
    .description('switch between chat sessions or topics')
    .option('-t, --topic', 'switch to a different topic')
    .argument('[name]', 'target chat session name')
    .action(async (name, { topic }) => {
        const { chat, topic: cgTopic } = act.chat.switch
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
        const { list, get, set, show, publish: ps } = act.chat.prompt
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
        const coverRun = () => set((cover as string)!, name)
        await matchRun(
            [
                [query, async () => await list(query!, name)],
                [modify, modifyRun],
                [typeof cover === 'boolean', coverStdinRun],
                [typeof cover === 'string', coverRun],
                [publish, async () => await ps(name)],
            ],
            () => show(name)
        )
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
        const pt = act.chat.preset
        await matchRun(
            [
                [edit, async () => await pt.edit(name)],
                [clear, () => pt.clear(name)],
            ],
            () => pt.show(name)
        )
    })

program
    .command('config')
    .alias('cf')
    .description('configure chat settings')
    .option('-m, --model', 'switch AI model')
    .option('-c, --context', 'enable/disable context memory', false)
    .option('-z, --context-size <number>', 'set context window size')
    .option('-p, --mcp', 'enable/disable MCP tools', false)
    .option('-s, --scenario', 'select conversation scenario')
    .action(async ({ contextSize, model, context, mcp, scenario }, cmd) => {
        const name = cmd.parent?.opts().force as string
        const cf = act.chat.config
        await matchRun(
            [
                [
                    contextSize,
                    () => cf.contextSize(parseIntNumber(contextSize, 10), name),
                ],
                [model, () => cf.model(name)],
                [context, () => cf.context(name)],
                [mcp, () => cf.mcp(name)],
                [scenario, () => cf.scenario(name)],
            ],
            () => cf.show(name)
        )
    })

program
    .command('export')
    .alias('exp')
    .argument('[path]', 'export directory (default: $HOME)')
    .description('export chat conversations')
    .option('-a, --all', 'export all chat sessions')
    .option('-c, --chat', 'export all topics from selected chat')
    .option('-t, --topic', 'export specific topic from selected chat')
    .action(async (path, { all, chat, topic }) => {
        const exp = act.chat.export
        const f = (pf: (p?: string) => Promise<void>) => {
            return async () => await pf(path)
        }
        await matchRun([
            [all, f(exp.all)],
            [chat, f(exp.chat)],
            [topic, f(exp.chatTopic)],
            [true, f(exp.topic)],
        ])
    })

program.parseAsync().catch((e: unknown) => {
    const { message } = e as Error
    print(terminalColor.red(message))
})
