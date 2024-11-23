import os from 'node:os'

const env = (key: string): string | undefined => process.env[`${key}`]

const platform = os.platform()

export { env, platform }