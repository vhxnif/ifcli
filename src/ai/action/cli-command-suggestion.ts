import { input } from '@inquirer/prompts'
import { $ } from "bun"
import { error } from '../../util/common-utils'
import { call, coderModel, system, user } from '../open-ai-client'

const sysPrompt = `
# 身份与目的

你精通常用命令行的命令，可以根据用户的描述，精准给出合适的命令。

# 环境信息

- 用户使用的Bash为：${process.env.BASH}
- 环境变量信息为：${process.env.PATH}

# 步骤 

- 理解用户的描述
- 参考tldr(https://github.com/tldr-pages/tldr)给出最符合的一条命令。
- 如果有多条命令符合条件，优先提供不需要网络即可使用的命令。
- 自己检查一遍给出的命令建议，确认给出的命令及其参数正确，并且可以在用户的Bash执行。

# 输出限制

- 给出最符合用户描述的一条命令，不要有除命令以外其他的信息
- 命令中的参数使用<>， 例如 git tag -m <message>
`

const suggest = async (content: string, excluded: string[] = []) => {
    const userMessage = user(
        excluded.length === 0 
        ? content
        : `${content}
        排除以下命令：
        ${excluded}
        `
    );
    call(
        [system(sysPrompt), userMessage],
        coderModel,
        async c => {
            const answer = await input({ message: c });
            if(answer === 'next') {
                await suggest(content, [...excluded, c])
                return
            }
            const regex = /<([^>]+)>/g;
            const args = answer.split(' ')
            let idx = 0
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const command =  c.replace(regex, function (match, p1) {
                return args[idx++]
            })
            try {
                await $`${{ raw: command }}`
            } catch (err) {
                error(err)
            }
        }
    )
}

export { suggest }
