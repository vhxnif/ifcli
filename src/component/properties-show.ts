import type { ChalkInstance } from 'chalk'
import type { Setting } from '../config/app-setting'
import type { AgentInfo } from '../store/agent-manager'
import type { TerminalColorName } from './theme/theme-type'

const propertyShow =
    (color: Record<TerminalColorName, ChalkInstance>) =>
    (k: string, v: string, defaultValue: string, depth: number = 0) => {
        const { yellow, red } = color
        return `${'  '.repeat(depth)}${yellow.bold(k)} ${v || red(defaultValue)}`
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
        show('Model:', magenta.underline(meta.model), '(none)'),
        show('Reasoning Level:', green(meta.thinkingLevel), '(none)'),
        show('Active Skills:', blue(meta.skills.join(', ')), '(none)'),
        show('Active MCPs:', blue(meta.activeMcps.join(', ')), '(none)'),
        show(
            'Active Custom Tags:',
            blue(meta.activeCustomTags.join(', ')),
            '(none)',
        ),
        show(
            'System Prompt:',
            gray(`\n${limitPrompt(meta.systemPrompt)}`),
            '(none)',
        ),
    ].join('\n')
}

const settingConfigShow = (
    color: Record<TerminalColorName, ChalkInstance>,
    setting: Setting,
) => {
    const { magenta, green, red, blue } = color
    const show = propertyShow(color)
    return [
        show('Theme:', magenta(setting.generalSetting.theme), '(none)'),
        show(
            'AutoName:',
            setting.session?.autoName?.enabled
                ? green('enabled')
                : red('disabled'),

            '(none)',
        ),
        show(
            'Compaction:',
            setting.compaction?.enabled ? green('enabled') : red('disabled'),
            '(none)',
        ),
        show(
            'Trigger:',
            `${red(`${setting.compaction.triggerRatio * 100}%`)} ${blue(`of context window`)}`,
            '(none)',
            1,
        ),
        show(
            'Keep Recent:',
            red(`${setting.compaction.keepRecentRatio * 100}%`),
            '(none)',
            1,
        ),
    ].join('\n')
}

export { chatConfigShow, settingConfigShow }
