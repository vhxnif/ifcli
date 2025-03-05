import { Command } from '@commander-js/extra-typings'
import { default as resShow } from './llm/llm-res-prompt'



const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .action(async () => {
        const content = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
        const think = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
        await resShow({ content, think })

    })
progrem.parseAsync()
