import { Command } from '@commander-js/extra-typings'
import { trans } from './ai/action/trans-action'
import { improve } from './ai/action/improve-writing'
import { suggest } from './ai/action/cli-command-suggestion';
import { blue, error, output, println } from './util/common-utils';
import type { ChalkInstance } from 'chalk';

const program = new Command();


program
  .name('tools')
  .description('CLI for various AI tools.')
  .version('0.1.0');

program.command('trans')
  .description('Translation Master')
  .argument('<string>')
  .option('-l, --language <lang>', 'target language', 'en')
  .action(async (content, option) => await trans(content.trim(), option.language))

program.command('improve')
  .description('Writing Expert')
  .argument('<string>')
  .action(async (content) => await improve(content.trim()))

program.command('suggest')
.description('suggestion cli command')
.argument('<string>')
.action(async (content) => await suggest(content.trim()))
const wt = (str: string, color: ChalkInstance) => {
    output(str, ['<lang>'], color)
}

program.configureOutput({
    writeOut: str => wt(str, blue),
    writeErr: str => wt(str, error)
})
program.parseAsync();
