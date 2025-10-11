/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { accessSync, constants, mkdirSync } from 'node:fs'
import path from 'path'
import { env, platform } from '../util/platform-utils'
import { APP_VERSION } from './app-setting'

export class DataPathConfig {
    private get appName(): string {
        return 'ifcli'
    }
    get configPath(): string | undefined {
        const platformConfigPath = this.platformConfigPath
        const appName = this.appName
        const appConfig = `${platformConfigPath}${path.sep}${appName}`
        try {
            accessSync(platformConfigPath, constants.F_OK)
        } catch (err: any) {
            throw Error(
                `platform: ${platform}, configPath missing. ${platformConfigPath}`
            )
        }
        try {
            accessSync(appConfig, constants.F_OK)
            return appConfig
        } catch (err: any) {
            mkdirSync(appConfig, { recursive: true })
            return appConfig
        }
    }
    get platformConfigPath(): string {
        if (!['win32', 'linux', 'darwin'].includes(platform)) {
            throw Error(`${platform} not supported.`)
        }
        let pt = env('APPDATA')!
        if (['linux', 'darwin'].includes(platform)) {
            pt = `${env('HOME')}${path.sep}.config`
        }
        return pt
    }
    get databasePath(): string {
        return `${this.configPath}${path.sep}${this.appName}_${APP_VERSION}.sqlite`
    }
}
