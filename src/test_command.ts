import { Command } from '@commander-js/extra-typings'
import { select } from './util/inquirer-utils'


const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .action(async () => {
        await select({ message: "select", default: "3", choices: [
            {"name": "1", "value": "1", "short": "a"},
            {"name": "2", "value": "2"},
            {"name": "3", "value": "3"},
            {"name": "4", "value": "4"},
        ]})

    })

progrem.parseAsync()
