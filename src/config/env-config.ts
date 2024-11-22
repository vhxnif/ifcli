import path from 'path'
import { env, platform } from '../util/config-utils'
import type { IConfig } from '../types/config-types'

export class EnvConfig implements  IConfig {
    commonModel = env('OPENAI_MODEL')
    coderModel = env('CODER_MODEL')
    appName = env('APP_NAME')
    baseURL = env('OPENAI_BASE_URL')
    apiKey = env('OPENAI_API_KEY')
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
}
