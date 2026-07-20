#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 ./app-context 的 chatService/terminalColor/availableModels，依赖 ./config/app-setting 的 APP_VERSION，
 *          依赖 ./component/theme/color-scheme 的 commanderHelpConfiguration，依赖 ./util/* 的 CLI 工具
 * [OUTPUT]: ifchat/ict CLI 命令（默认聊天、new/remove/switch/config/history）
 * [POS]: src/ 的 CLI 入口之一，被 package.json bin 指向
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Command } from '@commander-js/extra-typings'
import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import chalk from 'chalk'
import { availableModels, chatService, terminalColor } from './app-context'
import { commanderHelpConfiguration } from './component/theme/color-scheme'
import { APP_VERSION } from './config/app-setting'
import {
    editor,
    isEmpty,
    matchRun,
    parseIntNumber,
    print,
    println,
    stdin,
} from './util/common-utils'
import { select } from './util/inquirer-utils'

const getCurrentSessionId = (): string | undefined => {
    const sessions = chatService.listSessions()
    return sessions[0]?.id
}

const defaultModelStr = (): string => {
    if (availableModels.length > 0) {
        const m = availableModels[0]
        return `${m.provider}/${m.id}`
    }
    return 'deepseek/deepseek-chat'
}

const program = new Command()
    .configureHelp(commanderHelpConfiguration(terminalColor))
    .enablePositionalOptions()

program
    .name('ifchat')
    .alias('ict')
    .version(`${APP_VERSION}`)
    .description('Interactive AI chat interface (powered by Pi)')
    .option('-f, --force <id>', 'use specified chat session')
    .option('-s, --sync-call', 'use synchronous (non-streaming) mode')
    .option('-e, --edit', 'open editor for input')
    .option('-t, --new-session', 'create a new session for this message')
    .option('-r, --retry', 'retry the last question')
    .option('-a, --attachment <file>', 'attach text file content to message')
    .argument(
        '[string...]',
        'chat message content (multiple arguments will be joined)',
    )
    .action(async (content, option) => {
        const { edit, syncCall, newSession, force, attachment } = option

        const withAttachment = async (ct: string) => {
            if (!attachment) return ct
            const fileContent = await Bun.file(attachment).text()
            return `# User\n\n${ct}\n\n# Attachment \n\n${fileContent}`
        }

        const getOrCreateSession = async (): Promise<string> => {
            if (force) return force
            if (newSession) {
                const name = `Chat ${new Date().toLocaleString()}`
                return chatService.createSession({
                    name,
                    modelStr: defaultModelStr(),
                })
            }
            // 获取第一个 session 或创建
            const sessions = chatService.listSessions()
            if (sessions.length === 0) {
                const name =
                    content.join(' ').slice(0, 50) ||
                    `Chat ${new Date().toLocaleString()}`
                return chatService.createSession({
                    name,
                    modelStr: defaultModelStr(),
                })
            }
            return sessions[0].id
        }

        const ask = async (ct: string) => {
            const sessionId = await getOrCreateSession()
            await chatService.runChat({
                content: await withAttachment(ct),
                sessionId,
                noStream: !!syncCall,
            })
        }

        const getContentAndAsk = async (
            f: () => Promise<string | undefined>,
        ) => {
            const text = await f()
            if (text) await ask(text)
        }

        const contentRun = async () => await ask(content.join(' ')!)
        const editRun = async () =>
            await getContentAndAsk(async () => await editor(''))
        const stdinRun = async () => await getContentAndAsk(stdin)

        await matchRun([
            [!isEmpty(content), contentRun],
            [edit, editRun],
            [true, stdinRun],
        ])
    })

// ── new ──

program
    .command('new')
    .description('create a new chat session')
    .argument('<name>', 'name for the new session')
    .option('-m, --model <str>', 'model as provider/modelId', defaultModelStr())
    .action(async (name, { model }) => {
        chatService.createSession({ name, modelStr: model })
        println(
            terminalColor.green(
                `Session "${name}" created with model ${model}`,
            ),
        )
    })

// ── remove ──

program
    .command('remove')
    .alias('rm')
    .description('delete a chat session')
    .action(async (_, cmd) => {
        const force = cmd.parent?.opts()?.force as string | undefined
        if (force) {
            chatService.deleteSession(force)
            println(terminalColor.green(`Session deleted.`))
            return
        }
        const sessions = chatService.listSessions()
        if (sessions.length === 0) {
            println(terminalColor.yellow('No sessions to remove.'))
            return
        }
        const choice = await select({
            message: 'Select session to remove:',
            choices: sessions.map((s) => ({ name: s.name, value: s.id })),
        })
        chatService.deleteSession(choice)
        println(terminalColor.green(`Session deleted.`))
    })

// ── switch ──

program
    .command('switch')
    .alias('st')
    .description('switch between chat sessions')
    .action(async (_, cmd) => {
        const force = cmd.parent?.opts()?.force as string | undefined
        const sessions = chatService.listSessions()
        const activeId = force || getCurrentSessionId()
        if (sessions.length === 0) {
            println(terminalColor.yellow('No sessions available.'))
            return
        }
        if (sessions.length === 1) {
            const s = sessions[0]
            const isActive = s.id === activeId
            println(
                terminalColor.yellow(
                    `No other session to switch to. Current: ${s.name}${isActive ? ' (active)' : ''}`,
                ),
            )
            return
        }
        const choice = await select({
            message: 'Select session to switch to:',
            choices: sessions.map((s) => ({
                name: s.id === activeId ? `${s.name} (active)` : s.name,
                value: s.id,
                disabled: s.id === activeId ? 'current session' : false,
            })),
        })
        println(terminalColor.green(`Switched to session: ${choice}`))
        // 后续命令通过 -f 指定 session id
        println(chalk.gray(`Use: ict -f ${choice.slice(0, 8)}... <message>`))
    })

// ── config ──

program
    .command('config')
    .alias('cf')
    .description('configure chat session settings')
    .option('-m, --model', 'switch AI model')
    .option(
        '-t, --thinking <level>',
        'set thinking level (off/minimal/low/medium/high/xhigh/max)',
    )
    .option('-p, --prompt', 'modify system prompt')
    .action(async ({ model, thinking, prompt }, cmd) => {
        const force =
            (cmd.parent?.opts()?.force as string | undefined) ||
            getCurrentSessionId()
        if (!force) {
            println(
                terminalColor.yellow(
                    'No sessions available. Use -f <session-id> or start a chat first.',
                ),
            )
            return
        }
        const handle = chatService.getSession(force)
        const meta = await handle.storage.getMetadata()

        if (thinking) {
            const validLevels = [
                'off',
                'minimal',
                'low',
                'medium',
                'high',
                'xhigh',
                'max',
            ]
            if (!validLevels.includes(thinking)) {
                println(
                    terminalColor.red(
                        `Invalid thinking level: ${thinking}. Valid: ${validLevels.join(', ')}`,
                    ),
                )
                return
            }
            await handle.updateMeta({
                thinkingLevel: thinking as ThinkingLevel,
            })
            println(terminalColor.green(`Thinking level set to: ${thinking}`))
        }

        if (model) {
            // 从 Pi 模型发现结果中选择
            if (availableModels.length === 0) {
                println(
                    terminalColor.yellow(
                        'No models available. Check Pi environment variables.',
                    ),
                )
                return
            }
            const choices = availableModels.map((m) => ({
                name: `${m.provider}/${m.id}`,
                value: `${m.provider}/${m.id}`,
            }))
            const modelStr = await select({
                message: 'Select model (provider/modelId):',
                choices,
            })
            await handle.updateMeta({ model: modelStr })
            println(terminalColor.green(`Model set to: ${modelStr}`))
        }

        if (prompt) {
            const current = meta.systemPrompt || '(none)'
            const newPrompt = await editor(current)
            if (newPrompt !== undefined && newPrompt !== current) {
                await handle.updateMeta({ systemPrompt: newPrompt })
                println(terminalColor.green('System prompt updated.'))
            }
        }

        if (!thinking && !model && !prompt) {
            // 显示当前配置
            println(chalk.bold('Session Configuration:'))
            println(`  Model: ${meta.model || '(not set)'}`)
            println(`  Thinking Level: ${meta.thinkingLevel}`)
            println(
                `  System Prompt: ${meta.systemPrompt ? `${meta.systemPrompt.slice(0, 100)}...` : '(none)'}`,
            )
        }
    })

// ── history ──

program
    .command('history')
    .alias('hs')
    .description('view chat conversation history')
    .option('-l, --limit <number>', 'max messages to display', '50')
    .action(async ({ limit }, cmd) => {
        const force =
            (cmd.parent?.opts()?.force as string | undefined) ||
            getCurrentSessionId()
        if (!force) {
            println(
                terminalColor.yellow(
                    'No sessions available. Use -f <session-id> or start a chat first.',
                ),
            )
            return
        }
        const handle = chatService.getSession(force)
        const entries = await handle.storage.getEntries()
        const msgEntries = entries
            .filter((e) => e.entryType === 'message')
            .slice(-parseIntNumber(limit, 50))

        for (const entry of msgEntries) {
            try {
                const msg = JSON.parse(entry.content)
                const role = msg.role as string
                const content =
                    typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content)

                if (role === 'user') {
                    println(
                        terminalColor.cyan.bold('▸ ') +
                            terminalColor.cyan(content.slice(0, 200)),
                    )
                } else if (role === 'assistant') {
                    println(terminalColor.white(content.slice(0, 300)))
                }
                println(chalk.gray('---'))
            } catch {
                // skip malformed
            }
        }

        // 显示 compaction 标记
        const compactions = entries.filter((e) => e.entryType === 'compaction')
        if (compactions.length > 0) {
            println(
                terminalColor.yellow(
                    `[${compactions.length} compaction(s) in history]`,
                ),
            )
        }
    })

program.parseAsync().catch((e: unknown) => {
    print(terminalColor.red(e instanceof Error ? e.message : String(e)))
})
