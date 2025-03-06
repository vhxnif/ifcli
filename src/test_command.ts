import { Command } from '@commander-js/extra-typings'
import { marked, type MarkedExtension } from 'marked'
import { markedTerminal } from 'marked-terminal'
import ora from 'ora'
import { table } from 'table'
import { tableConfig } from './util/common-utils'
import { llmNotifyMessage } from './llm/llm-utils'

const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .action(async () => {
        marked.use(markedTerminal() as MarkedExtension)
        const sp = ora(llmNotifyMessage.waiting).start()
        setTimeout(() => {
            sp.text = llmNotifyMessage.analyzing
        }, 2000)
        setTimeout(() => {
            setInterval(() => {
                const str = `**Zed (Development Tool)**: If you're referring to a development tool or editor named Zed, it might be a project or tool I'm not familiar with. Feel free to provide more information, and I'll do my best to help!`
                const tbStr = table([[str]], tableConfig({ cols: [1] }))
                sp.text = `${llmNotifyMessage.thinking}\n${tbStr}`
            }, 1000)
        }, 4000)
        setTimeout(() => {
            const str = `**Typo or Miscommunication**: If you meant "Zed" as in the letter "Z" (used in British English), or something else entirely, let me know so I can assist better.`
            const tbStr = table([[str]], tableConfig({cols: [1]}))
            sp.text = `${llmNotifyMessage.completed}\n${tbStr}`
            sp.succeed()
        }, 6000)
        
    })

progrem.parseAsync()
