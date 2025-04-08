import { Command } from '@commander-js/extra-typings'
import { isEmpty } from './util/common-utils'


const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .action(() => {
        console.log(`'' -> ${isEmpty('')}`)
        console.log(`undefind -> ${isEmpty(undefined)}`)
        console.log(`null -> ${isEmpty(null)}`)
        console.log(`[] -> ${isEmpty([])}`)
    })

progrem.parseAsync()
