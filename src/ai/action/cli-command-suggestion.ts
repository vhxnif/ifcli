import { input } from '@inquirer/prompts'
import { call, coderModel, user, system } from '../open-ai-client'
import { $ } from "bun"
import { error } from '../../util/common-utils'

const sysPrompt = `
# 身份与目的

你精通常用命令行的命令，可以根据用户的描述，精准给出合适的命令。


# 步骤 

- 理解用户的描述
- 参考tldr(https://github.com/tldr-pages/tldr)给出最符合的一条命令
- 如果有多个符合条件的命令，优先使用不用联网访问的命令
- 检查给出的命令是否是正确的，确认无误以后再给用户


# 输出限制

- 给出最符合用户描述的一条命令，不要有除命令以外其他的信息
- 命令中的参数使用<>， 例如 git tag -m <message>
`

const suggest = async (content: string, exclude?: string[]) => {
    call(
        [system(sysPrompt), user(exclude ? content + ' 排除下面的命令：' + exclude : content)],
        coderModel,
        async c => {
            const answer = await input({ message: c });
            if(answer == 'next') {
                await suggest(content, exclude ? [...exclude, c] : [])
                return
            }
            const regex = /<([^>]+)>/g;
            const args = answer.split(' ')
            let idx = 0
            const command =  c.replace(regex, function (match, p1) {
                return args[idx++]
            })
            try {
                await $`${{ raw: command }}`
            } catch(err) {
                error(err)
            }
        }
    )
}

export { suggest }