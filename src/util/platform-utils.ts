import os from 'node:os'

const env = (key: string): string | undefined => process.env[`${key}`]

const platform = os.platform()


const terminal: Record<string, number> = {
    column: process.stdout.columns,
    row: process.stdout.rows,
}

export { env, platform, terminal }