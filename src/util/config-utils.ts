import os from 'node:os'

const env = (key: string): string => process.env[`${key}`]!

const platform = os.platform()

export { env, platform }