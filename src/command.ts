#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { toolsAction } from './app-context'
import { error, textColor } from './util/common-utils'

const program = new Command()

program
  .name('tools')
  .description('CLI for various AI tools.')
  .version('0.1.0')

program.command('trans')
  .description('Translation Master')
  .argument('<string>')
  .option('-l, --language <lang>', 'target language', 'en')
  .action(async (content, option) => await toolsAction.trans(content.trim(), option.language))

program.command('improve')
  .description('Writing Expert')
  .argument('<string>')
  .action(async (content) => await toolsAction.improve(content.trim()))

program.command('suggest')
.description('suggestion cli command')
.argument('<string>')
.action(async (content) => await toolsAction.suggest(content.trim(), []))

program.configureOutput({
    writeOut: str => textColor(str),
    writeErr: str => error(str)
})
program.parseAsync()
