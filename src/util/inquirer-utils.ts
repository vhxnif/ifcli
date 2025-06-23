import input from '@inquirer/input'
import select from '@inquirer/select'

export type Choice = {
    name: string,
    value: string,
    description?: string,
}

const selectRun = async (
    message: string,
    choices: Choice[],
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