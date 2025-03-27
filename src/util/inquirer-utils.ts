import input from '@inquirer/input'
import select from '@inquirer/select'

const selectRun = async (
    message: string,
    choices: { name: string; value: string }[],
    f: (str: string) => void
) => f(await select({ message, choices }))

const inputRun = async (message: string, f: (str: string) => void) =>
    f(await input({ message }))

export {
    selectRun,
    inputRun,
    select,
    input,
}