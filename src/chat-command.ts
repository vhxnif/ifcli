#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 ./app-context 的 chatService/terminalColor/availableModels，依赖 ./config/app-setting 的 APP_VERSION，
 *          依赖 @earendil-works/pi-ai 的 Message 类型，
 *          依赖 ./component/theme/color-scheme 的 commanderHelpConfiguration，依赖 ./util/* 的 CLI 工具
 * [OUTPUT]: ifchat/ict CLI 命令（默认聊天、new/remove/switch/config/history），读写 active agent 状态，管理 agent skills，history 按角色友好渲染
 * [POS]: src/ 的 CLI 入口之一，被 package.json bin 指向
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Command } from '@commander-js/extra-typings'
import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import type { Message } from '@earendil-works/pi-ai'
import chalk from 'chalk'
import {
    availableModels,
    chatService,
    themeScheme,
    toolRegistry,
} from './app-context'
import { show as historyShow } from './component/agent-history-show'
import { chatConfigShow } from './component/properties-show'
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

const { red, green, yellow } = themeScheme.chalkColor

const getCurrentAgentId = (): string | undefined => {
    const activeId = chatService.getActiveAgentId()
    const agents = chatService.listAgents()
    if (activeId && agents.some((a) => a.id === activeId)) {
        return activeId
    }
    return agents[0]?.id
}

const resolveAgentId = (
    force: string | undefined,
    opts: { allowMissing?: boolean; fallback?: boolean } = {},
): string | undefined => {
    const { allowMissing = false, fallback = true } = opts
    if (!force) {
        return fallback ? getCurrentAgentId() : undefined
    }
    const agents = chatService.listAgents()
    const match =
        agents.find((a) => a.id === force) ||
        agents.find((a) => a.name === force)
    if (!match) {
        if (!allowMissing) {
            println(
                red(
                    `Agent not found: ${force}. Use "ict switch" to list agents.`,
                ),
            )
        }
        return undefined
    }
    return match.id
}

const getGlobalForce = (cmd: any): string | undefined => {
    return (
        cmd.parent?.opts()?.force ??
        (cmd as any).optsWithGlobals?.()?.force ??
        undefined
    )
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
    .configureHelp(commanderHelpConfiguration(themeScheme.color))
    .enablePositionalOptions()

program
    .name('ifchat')
    .alias('ict')
    .version(`${APP_VERSION}`)
    .description('Interactive AI chat interface (powered by Pi)')
    .option('-f, --force <id-or-name>', 'use specified agent by id or name')
    .option('-s, --sync-call', 'use synchronous (non-streaming) mode')
    .option('-e, --edit', 'open editor for input')
    .option(
        '-t, --new-session',
        'create a new session under current agent for this message',
    )
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
                        red(
                            `Agent not found: ${force}. Use "ict switch" to list agents.`,
                        ),
                    )
                    return undefined
                }
                return match.id
            }
            const activeId = getCurrentAgentId()
            if (activeId) return activeId
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
            println(green(`Agent "${name}" created with model ${model}`))
        } catch (e: unknown) {
            println(red(e instanceof Error ? e.message : String(e)))
        }
    })

// ── remove ──

program
    .command('remove')
    .alias('rm')
    .description('delete an agent (chat) and all its sessions')
    .action(async (_, cmd) => {
        const force = getGlobalForce(cmd)
        if (force) {
            const agentId = resolveAgentId(force)
            if (!agentId) return
            chatService.deleteAgent(agentId)
            println(green(`Agent deleted.`))
            return
        }
        const agents = chatService.listAgents()
        if (agents.length === 0) {
            println(yellow('No agents to remove.'))
            return
        }
        const choice = await select({
            message: 'Select agent to remove:',
            choices: agents.map((a) => ({ name: a.name, value: a.id })),
        })
        chatService.deleteAgent(choice)
        println(green(`Agent deleted.`))
    })

// ── switch ──

program
    .command('switch')
    .alias('st')
    .description('switch between agents (chats)')
    .action(async (_, cmd) => {
        const force = getGlobalForce(cmd)
        const agents = chatService.listAgents()
        const activeId = resolveAgentId(force) ?? getCurrentAgentId()
        if (agents.length === 0) {
            println(yellow('No agents available.'))
            return
        }
        if (agents.length === 1) {
            const a = agents[0]
            const isActive = a.id === activeId
            println(
                yellow(
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
        chatService.setActiveAgentId(choice)
        const targetName = agents.find((a) => a.id === choice)?.name ?? choice
        println(green(`Switched to agent: ${targetName}`))
        println(chalk.gray(`Use: ict -f ${targetName} <message>`))
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
    .option('-s, --system-prompt [prompt]', 'set or edit system prompt')
    .option('-k, --skills', 'enable/disable skills for this agent')
    .action(async ({ model, reasoning, tools, systemPrompt, skills }, cmd) => {
        const agentId = resolveAgentId(getGlobalForce(cmd))
        if (!agentId) {
            println(
                yellow(
                    'No agents available. Use -f <agent-name> or start a chat first.',
                ),
            )
            return
        }
        const handle = chatService.getAgent(agentId)
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
                    red(
                        `Invalid reasoning level: ${reasoning}. Valid: ${validLevels.join(', ')}`,
                    ),
                )
                return
            }
            await handle.update({
                thinkingLevel: reasoning as ThinkingLevel,
            })
            println(green(`Reasoning level set to: ${reasoning}`))
        }

        if (model) {
            // 从 Pi 模型发现结果中选择
            if (availableModels.length === 0) {
                println(
                    yellow(
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
            println(green(`Model set to: ${modelStr}`))
        }

        if (tools) {
            const groups = toolRegistry.availableGroups()
            if (groups.length === 0) {
                println(
                    yellow(
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
                theme: checkboxThemeStyle(themeScheme.chalkColor),
            })
            const activeMcps = selected
                .filter((id) => id.startsWith('mcp:'))
                .map((id) => id.slice(4))
            const activeCustomTags = selected
                .filter((id) => id.startsWith('custom:'))
                .map((id) => id.slice(7))
            await handle.update({ activeMcps, activeCustomTags })
            println(green('Active tools updated.'))
        }

        if (systemPrompt) {
            const newPrompt =
                typeof systemPrompt === 'string'
                    ? systemPrompt
                    : await editor(meta.systemPrompt ?? '')
            await handle.update({ systemPrompt: newPrompt })
            println(green('System prompt updated.'))
        }

        if (skills) {
            const available = toolRegistry.availableSkills()
            if (available.length === 0) {
                println(
                    yellow(
                        'No skills available. Add SKILL.md files to the skills directory first.',
                    ),
                )
                return
            }
            const active = new Set(meta.skills)
            const choices = available.map((s) => ({
                name: s.name,
                value: s.name,
                checked: active.has(s.name),
            }))
            const selected = await checkbox({
                message: 'Select active skills for this agent:',
                choices,
                theme: checkboxThemeStyle(themeScheme.chalkColor),
            })
            await handle.update({ skills: selected })
            println(green('Active skills updated.'))
        }

        if (!reasoning && !model && !tools && !systemPrompt && !skills) {
            // 显示当前配置
            println(chatConfigShow(themeScheme.chalkColor, meta))
        }
    })

// ── history ──

program
    .command('history')
    .alias('hs')
    .description('view current session (topic) conversation history')
    .option('-l, --limit <number>', 'max messages to display', '50')
    .action(async ({ limit }, cmd) => {
        const agentId = resolveAgentId(getGlobalForce(cmd))
        if (!agentId) {
            println(
                yellow(
                    'No agents available. Use -f <agent-name> or start a chat first.',
                ),
            )
            return
        }
        const sessionId = getCurrentSessionId(agentId)
        if (!sessionId) {
            println(yellow('No sessions available for this agent.'))
            return
        }
        const handle = chatService.getSession(sessionId)
        const entries = await handle.storage.getEntries()
        const msgEntries = entries
            .filter((e) => e.entryType === 'message')
            .slice(-parseIntNumber(limit, 50))
        const toolCallMap = new Map()
        for (const [_, entry] of msgEntries.entries()) {
            try {
                println(
                    historyShow(
                        themeScheme.chalkColor,
                        JSON.parse(entry.content) as Message,
                        toolCallMap,
                    ),
                )
            } catch {
                // skip malformed
            }
        }

        // 显示 compaction 标记
        const compactions = entries.filter((e) => e.entryType === 'compaction')
        if (compactions.length > 0) {
            println(yellow(`[${compactions.length} compaction(s) in history]`))
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
        const agentId = resolveAgentId(getGlobalForce(cmd))
        if (!agentId) {
            println(
                yellow(
                    'No agents available. Use -f <agent-name> or start a chat first.',
                ),
            )
            return
        }
        const sessionId = chatService.createSession({ agentId, name })
        println(green(`Session "${name}" created.`))
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
        const agentId = resolveAgentId(getGlobalForce(cmd))
        if (!agentId) {
            println(
                yellow(
                    'No agents available. Use -f <agent-name> or start a chat first.',
                ),
            )
            return
        }
        const sessions = chatService.listSessions(agentId)
        if (sessions.length === 0) {
            println(yellow('No sessions available.'))
            return
        }
        const choice = await select({
            message: 'Select session to switch to:',
            choices: sessions.map((s) => ({
                name: s.name,
                value: s.id,
            })),
        })
        println(green(`Switched to session: ${choice}`))
        println(chalk.gray(`Use: ict -f ${agentId.slice(0, 8)}... <message>`))
    })

sessionCmd
    .command('remove')
    .alias('rm')
    .description('remove a session under current agent')
    .action(async (_, cmd) => {
        const agentId = resolveAgentId(getGlobalForce(cmd))
        if (!agentId) {
            println(
                yellow(
                    'No agents available. Use -f <agent-name> or start a chat first.',
                ),
            )
            return
        }
        const sessions = chatService.listSessions(agentId)
        if (sessions.length === 0) {
            println(yellow('No sessions to remove.'))
            return
        }
        const choice = await select({
            message: 'Select session to remove:',
            choices: sessions.map((s) => ({ name: s.name, value: s.id })),
        })
        chatService.deleteSession(choice)
        println(green(`Session deleted.`))
    })

program.parseAsync().catch((e: unknown) => {
    print(red(e instanceof Error ? e.message : String(e)))
})
