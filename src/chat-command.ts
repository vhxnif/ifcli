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
import {
    availableModels,
    chatService,
    terminalColor,
    toolRegistry,
} from './app-context'
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
import { checkbox, checkboxThemeStyle, select } from './util/inquirer-utils'

const getCurrentAgentId = (): string | undefined => {
    const agents = chatService.listAgents()
    return agents[0]?.id
}

const getCurrentSessionId = (agentId: string): string | undefined => {
    const sessions = chatService.listSessions(agentId)
    return sessions[0]?.id
}

const getOrCreateCurrentSession = async (
    agentId: string,
    contentHint: string,
): Promise<string> => {
    const sessions = chatService.listSessions(agentId)
    if (sessions.length > 0) return sessions[0].id
    return chatService.createSession({
        agentId,
        name:
            contentHint.slice(0, 50) ||
            `Session ${new Date().toLocaleString()}`,
    })
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
    .option('-f, --force <id>', 'use specified agent')
    .option('-s, --sync-call', 'use synchronous (non-streaming) mode')
    .option('-e, --edit', 'open editor for input')
    .option(
        '-t, --new-session',
        'create a new session under current agent for this message',
    )
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

        const getOrCreateAgent = async (): Promise<string | undefined> => {
            if (force) {
                const agents = chatService.listAgents()
                const match =
                    agents.find((a) => a.id === force) ||
                    agents.find((a) => a.name === force)
                if (!match) {
                    println(
                        terminalColor.red(
                            `Agent not found: ${force}. Use "ict switch" to list agents.`,
                        ),
                    )
                    return undefined
                }
                return match.id
            }
            const agents = chatService.listAgents()
            if (agents.length === 0) {
                return chatService.createAgent({
                    name:
                        content.join(' ').slice(0, 50) ||
                        `Agent ${new Date().toLocaleString()}`,
                    modelStr: defaultModelStr(),
                })
            }
            return agents[0].id
        }

        const ask = async (ct: string) => {
            const agentId = await getOrCreateAgent()
            if (!agentId) return
            const sessionId = newSession
                ? chatService.createSession({
                      agentId,
                      name: `Session ${new Date().toLocaleString()}`,
                  })
                : await getOrCreateCurrentSession(agentId, content.join(' '))
            await chatService.runChat({
                content: await withAttachment(ct),
                agentId,
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
    .description('create a new agent (chat)')
    .argument('<name>', 'name for the new agent')
    .option('-m, --model <str>', 'model as provider/modelId', defaultModelStr())
    .action(async (name, { model }) => {
        try {
            const agentId = chatService.createAgent({ name, modelStr: model })
            chatService.createSession({
                agentId,
                name: `Default Session ${new Date().toLocaleString()}`,
            })
            println(
                terminalColor.green(
                    `Agent "${name}" created with model ${model}`,
                ),
            )
        } catch (e: unknown) {
            println(
                terminalColor.red(e instanceof Error ? e.message : String(e)),
            )
        }
    })

// ── remove ──

program
    .command('remove')
    .alias('rm')
    .description('delete an agent (chat) and all its sessions')
    .action(async (_, cmd) => {
        const force = cmd.parent?.opts()?.force as string | undefined
        if (force) {
            chatService.deleteAgent(force)
            println(terminalColor.green(`Agent deleted.`))
            return
        }
        const agents = chatService.listAgents()
        if (agents.length === 0) {
            println(terminalColor.yellow('No agents to remove.'))
            return
        }
        const choice = await select({
            message: 'Select agent to remove:',
            choices: agents.map((a) => ({ name: a.name, value: a.id })),
        })
        chatService.deleteAgent(choice)
        println(terminalColor.green(`Agent deleted.`))
    })

// ── switch ──

program
    .command('switch')
    .alias('st')
    .description('switch between agents (chats)')
    .action(async (_, cmd) => {
        const force = cmd.parent?.opts()?.force as string | undefined
        const agents = chatService.listAgents()
        const activeId = force || getCurrentAgentId()
        if (agents.length === 0) {
            println(terminalColor.yellow('No agents available.'))
            return
        }
        if (agents.length === 1) {
            const a = agents[0]
            const isActive = a.id === activeId
            println(
                terminalColor.yellow(
                    `No other agent to switch to. Current: ${a.name}${isActive ? ' (active)' : ''}`,
                ),
            )
            return
        }
        const choice = await select({
            message: 'Select agent to switch to:',
            choices: agents.map((a) => ({
                name: a.id === activeId ? `${a.name} (active)` : a.name,
                value: a.id,
                disabled: a.id === activeId ? 'current agent' : false,
            })),
        })
        println(terminalColor.green(`Switched to agent: ${choice}`))
        println(chalk.gray(`Use: ict -f ${choice.slice(0, 8)}... <message>`))
    })

// ── config ──

program
    .command('config')
    .alias('cf')
    .description('configure current agent (chat) settings')
    .option('-m, --model', 'switch AI model')
    .option(
        '-r, --reasoning <level>',
        'set reasoning level (off/minimal/low/medium/high/xhigh/max)',
    )
    .option('-t, --tools', 'enable/disable tools for this agent')
    .action(async ({ model, reasoning, tools }, cmd) => {
        const force =
            (cmd.parent?.opts()?.force as string | undefined) ||
            getCurrentAgentId()
        if (!force) {
            println(
                terminalColor.yellow(
                    'No agents available. Use -f <agent-id> or start a chat first.',
                ),
            )
            return
        }
        const handle = chatService.getAgent(force)
        const meta = await handle.info

        if (reasoning) {
            const validLevels = [
                'off',
                'minimal',
                'low',
                'medium',
                'high',
                'xhigh',
                'max',
            ]
            if (!validLevels.includes(reasoning)) {
                println(
                    terminalColor.red(
                        `Invalid reasoning level: ${reasoning}. Valid: ${validLevels.join(', ')}`,
                    ),
                )
                return
            }
            await handle.update({
                thinkingLevel: reasoning as ThinkingLevel,
            })
            println(terminalColor.green(`Reasoning level set to: ${reasoning}`))
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
            await handle.update({ model: modelStr })
            println(terminalColor.green(`Model set to: ${modelStr}`))
        }

        if (tools) {
            const groups = toolRegistry.availableGroups()
            if (groups.length === 0) {
                println(
                    terminalColor.yellow(
                        'No tools available. Configure mcpServers/customTools in settings first.',
                    ),
                )
                return
            }
            const active = new Set([
                ...meta.activeMcps.map((n) => `mcp:${n}`),
                ...meta.activeCustomTags.map((t) => `custom:${t}`),
            ])
            const choices = groups.map((g) => ({
                name: `${g.type}: ${g.name}`,
                value: g.id,
                checked: active.has(g.id),
            }))
            const selected = await checkbox({
                message: 'Select active tools for this agent:',
                choices,
                theme: checkboxThemeStyle(terminalColor),
            })
            const activeMcps = selected
                .filter((id) => id.startsWith('mcp:'))
                .map((id) => id.slice(4))
            const activeCustomTags = selected
                .filter((id) => id.startsWith('custom:'))
                .map((id) => id.slice(7))
            await handle.update({ activeMcps, activeCustomTags })
            println(terminalColor.green('Active tools updated.'))
        }

        if (!reasoning && !model && !tools) {
            // 显示当前配置
            println(chalk.bold('Agent Configuration:'))
            println(`  Model: ${meta.model || '(not set)'}`)
            println(`  Reasoning Level: ${meta.thinkingLevel}`)
            println(`  Active MCPs: ${meta.activeMcps.join(', ') || '(none)'}`)
            println(
                `  Active Custom Tags: ${meta.activeCustomTags.join(', ') || '(none)'}`,
            )
        }
    })

// ── history ──

program
    .command('history')
    .alias('hs')
    .description('view current session (topic) conversation history')
    .option('-l, --limit <number>', 'max messages to display', '50')
    .action(async ({ limit }, cmd) => {
        const agentId =
            (cmd.parent?.opts()?.force as string | undefined) ||
            getCurrentAgentId()
        if (!agentId) {
            println(
                terminalColor.yellow(
                    'No agents available. Use -f <agent-id> or start a chat first.',
                ),
            )
            return
        }
        const sessionId = getCurrentSessionId(agentId)
        if (!sessionId) {
            println(
                terminalColor.yellow('No sessions available for this agent.'),
            )
            return
        }
        const handle = chatService.getSession(sessionId)
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

// ── session ──

const sessionCmd = program
    .command('session')
    .alias('ss')
    .description('manage sessions (topics) under current agent')

sessionCmd
    .command('new')
    .description('create a new session under current agent')
    .argument('<name>', 'name for the new session')
    .action(async (name, cmd) => {
        const agentId =
            ((cmd as any).optsWithGlobals?.()?.force as string | undefined) ||
            getCurrentAgentId()
        if (!agentId) {
            println(
                terminalColor.yellow(
                    'No agents available. Use -f <agent-id> or start a chat first.',
                ),
            )
            return
        }
        const sessionId = chatService.createSession({ agentId, name })
        println(terminalColor.green(`Session "${name}" created.`))
        println(
            chalk.gray(`Use: ict -f ${agentId.slice(0, 8)}... -t <message>`),
        )
        println(chalk.gray(`Session id: ${sessionId.slice(0, 8)}...`))
    })

sessionCmd
    .command('switch')
    .alias('sw')
    .description('switch session under current agent')
    .action(async (_, cmd) => {
        const agentId =
            ((cmd as any).optsWithGlobals?.()?.force as string | undefined) ||
            getCurrentAgentId()
        if (!agentId) {
            println(
                terminalColor.yellow(
                    'No agents available. Use -f <agent-id> or start a chat first.',
                ),
            )
            return
        }
        const sessions = chatService.listSessions(agentId)
        if (sessions.length === 0) {
            println(terminalColor.yellow('No sessions available.'))
            return
        }
        const choice = await select({
            message: 'Select session to switch to:',
            choices: sessions.map((s) => ({
                name: s.name,
                value: s.id,
            })),
        })
        println(terminalColor.green(`Switched to session: ${choice}`))
        println(chalk.gray(`Use: ict -f ${agentId.slice(0, 8)}... <message>`))
    })

sessionCmd
    .command('remove')
    .alias('rm')
    .description('remove a session under current agent')
    .action(async (_, cmd) => {
        const agentId =
            ((cmd as any).optsWithGlobals?.()?.force as string | undefined) ||
            getCurrentAgentId()
        if (!agentId) {
            println(
                terminalColor.yellow(
                    'No agents available. Use -f <agent-id> or start a chat first.',
                ),
            )
            return
        }
        const sessions = chatService.listSessions(agentId)
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

program.parseAsync().catch((e: unknown) => {
    print(terminalColor.red(e instanceof Error ? e.message : String(e)))
})
