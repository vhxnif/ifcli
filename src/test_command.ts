import { Command } from '@commander-js/extra-typings'
import { marked, type MarkedExtension } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { chatStore } from './app-context'
import { color } from './util/color-utils'


const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .action(async () => {
        const msg = chatStore.selectMessage('6g2CuSwS7vWaixmD9DHJx')
        marked.use(markedTerminal({
            paragraph: color.mauve,
            listitem: color.sapphire,
            hr: color.pink.bold,
            width: 70,
            reflowText: true,
            tab: 2,
        }) as MarkedExtension)
        console.log(marked.parse(msg.content) as string)
    })

progrem.parseAsync()
