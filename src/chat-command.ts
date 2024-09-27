import { Command } from '@commander-js/extra-typings';
import { ask, changeChat, changeWithContext, chatList, cleanMessage, currConfig, init, models, newChat, removeChat, updateContextSize, updateModel, updateSysPrompt } from './ai/action/chat-action';
import { error, println, output, blue } from './util/common-utils';
import type { ChalkInstance } from 'chalk';

const program = new Command();

program
    .name('chat')
    .description('Ask AI.')
    .version('0.1.0');

program.command('init')
    .action(() => init())

program.command('new')
    .description('New Chat')
    .argument('<string>')
    .option('-d, --default-prompt', 'Use default system prompt.', false)
    .action(async (content, option) => await newChat(content, option.defaultPrompt))

program.command('ask')
    .description('Talk with Agent.')
    .argument('<string>')
    .action(async (content) => await ask(content))

program.command('list')
    .description('List all chats.')
    .action(async () => chatList())

program.command('remove')
    .description('Remove chat by chat number')
    .action(async () => removeChat())

program.command('change')
    .description('Change to another chat by chat number.')
    .action(async () => changeChat())

program.command('clear')
    .description('Clear current chat message.')
    .action(() => cleanMessage())

program.command('config')
    .description('Manage Current Chat Config.')
    .option('-s, --sys-prompt <sysPrompt>', 'update current system prompt.')
    .option('-c, --context-size <contextSize>', 'update current context size.')
    .option('-m, --model <model>', `update current chat model, useful models: ${models()}`)
    .option('-w, --with-context', 'change with context', false)
    .action(async (option) => {
        const optFun: Record<string, (str: string) => void> = {
            'sysPrompt': updateSysPrompt,
            'contextSize': updateContextSize,
            'model': updateModel,
            'withContext': changeWithContext,
        }
        const opt = Object.entries(option).find(([_, v]) => v)
        if (!opt) {
            currConfig()
            return
        }
        const [key, value] = opt
        const fun = Object.entries(optFun).find(([k, _]) => k === key)
        if (!fun) {
            println(error(`option ${key} not support.`))
            return
        }
        const [_, f] = fun
        f(value.toString())
    })

const wt = (str: string, color: ChalkInstance) => {
    output(str, ['<sysPrompt>', '<contextSize>', '<model>'], color)
}

program.configureOutput({
    writeOut: str => wt(str, blue),
    writeErr: str => wt(str, error)
})
program.parseAsync();
