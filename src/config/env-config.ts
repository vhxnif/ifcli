import path from 'path'
import { env, platform } from '../util/config-utils'
import type { IConfig } from '../types/config-types'

export class EnvConfig implements  IConfig {
    commonModel = env('CHAT_MODEL') ?? 'deepseek-chat'
    coderModel = env('CODER_MODEL') ?? 'deepseek-coder'
    appName = env('APP_NAME') ?? 'ifcli'
    baseURL = env('BASE_URL') ?? 'https://api.deepseek.com'
    apiKey = env('API_KEY')!
    configPath = (): string | undefined => {
        if (platform == 'win32') {
            return env('APPDATA')
        }
        if (['linux', 'darwin'].includes(platform)) {
            return `${env('HOME')}${path.sep}.config`
        }
        throw Error(`platform: ${platform} not supported.`)
    }
    dataPath = `${this.configPath()}${path.sep}${this.appName}.sqlite`
    models = [this.coderModel, this.commonModel]
    terminalColumns = process.stdout.columns
    terminalRows = process.stdout.rows
}
