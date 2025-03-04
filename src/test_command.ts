import { Command } from '@commander-js/extra-typings'
import { tableConfig } from './util/common-utils'
import { table } from 'table'

const progrem = new Command()

progrem.name('test').description('test command').version('v1.0.0')

progrem
    .command('test')
    .argument('<string>')
    .action(async () => {
        let previousOutputLineCount = 0
        ;['table1', 'table2', 'table3'].forEach((it) => {
            if (previousOutputLineCount > 0) {
                // 光标上移 N 行（回到表格起始位置）
                process.stdout.write(`\x1B[${previousOutputLineCount}A`)
                // 清除从光标到屏幕结束的内容
                process.stdout.write('\x1B[0J')
            }
            const tableStr = table([[it]], tableConfig({ cols: [1] }))
            previousOutputLineCount = tableStr.split('\n').length - 1
            process.stdout.write(`${tableStr}`)
        })
    })
progrem.parseAsync()
