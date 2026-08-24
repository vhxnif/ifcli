import type { ChalkInstance } from 'chalk'
import type { Setting } from '../config/app-setting'
import type { AgentInfo } from '../store/agent-manager'
import type { TerminalColorName } from './theme/theme-type'

const propertyShow =
    (color: Record<TerminalColorName, ChalkInstance>) =>
    (
        k: string,
        v: [string, ChalkInstance] | string,
        options?: { depth?: number; newline?: boolean },
    ) => {
        const { yellow, red } = color
        const key = `${'  '.repeat(options?.depth ?? 0)}${yellow.bold(k)}`
        const withDefault = (s: string, f: () => string) => {
            const str = s || '(none)'
            if (str === '(none)') {
                return `${key} ${red(str)}`
            }
            return `${key}${options?.newline ? '\n' : ''}${f()}`
        }
        if (typeof v === 'string') {
            return withDefault(v, () => v)
        }
        const [value, vc] = v
        return withDefault(value, () => vc(value))
    }

const chatConfigShow = (
    color: Record<TerminalColorName, ChalkInstance>,
    meta: AgentInfo,
) => {
    const { magenta, gray, green, blue } = color
    const show = propertyShow(color)

    const limitPrompt = (str: string) => {
        const lines = str.split('\n')
        if (lines.length <= 6) {
            return str
        }
        return [
            ...lines.slice(0, 3),
            '...',
            ...lines.slice(lines.length - 3),
        ].join('\n')
    }

    return [
        show('Model:', [meta.model, magenta.underline]),
        show('Reasoning Level:', [meta.thinkingLevel, green]),
        show('Active Skills:', [meta.skills.join(', '), blue]),
        show('Active MCPs:', [meta.activeMcps.join(', '), blue]),
        show('Active Custom Tags:', [meta.activeCustomTags.join(', '), blue]),
        show('System Prompt:', [`${limitPrompt(meta.systemPrompt)}`, gray], {
            newline: true,
        }),
    ].join('\n')
}

const settingConfigShow = (
    color: Record<TerminalColorName, ChalkInstance>,
    setting: Setting,
) => {
    const { magenta, green, red, blue } = color
    const show = propertyShow(color)
    const arr = [
        show('Theme:', [setting.generalSetting.theme, magenta]),
        show(
            'AutoName:',
            setting.session?.autoName?.enabled
                ? green('enabled')
                : red('disabled'),
        ),
        show(
            'Compaction:',
            setting.compaction?.enabled ? green('enabled') : red('disabled'),
        ),
    ]
    if (setting.compaction?.enabled) {
        arr.push(
            show(
                'Trigger:',
                `${red(`${setting.compaction.triggerRatio * 100}%`)} ${blue(`of context window`)}`,
                { depth: 1 },
            ),
            show(
                'Keep Recent:',
                red(`${setting.compaction.keepRecentRatio * 100}%`),
                { depth: 1 },
            ),
        )
    }
    return arr.join('\n')
}

export { chatConfigShow, settingConfigShow }
