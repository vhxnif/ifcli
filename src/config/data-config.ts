/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { accessSync, constants, mkdirSync } from 'node:fs'
import path from 'node:path'
import { env, platform } from '../util/platform-utils'
import { APP_VERSION } from './app-setting'

export class DataPathConfig {
    private get appName(): string {
        return 'ifcli'
    }
    private get configPath(): string | undefined {
        const platformConfigPath = this.platformConfigPath
        const appName = this.appName
        const appConfig = path.join(platformConfigPath!, appName)
        try {
            accessSync(platformConfigPath, constants.F_OK)
        } catch (_err: any) {
            throw Error(
                `platform: ${platform}, configPath missing. ${platformConfigPath}`,
            )
        }
        try {
            accessSync(appConfig, constants.F_OK)
            return appConfig
        } catch (_err: any) {
            mkdirSync(appConfig, { recursive: true })
            return appConfig
        }
    }
    private get platformConfigPath(): string {
        if (!['win32', 'linux', 'darwin'].includes(platform)) {
            throw Error(`${platform} not supported.`)
        }

        if (['linux', 'darwin'].includes(platform)) {
            return path.join(env('HOME')!, '.config')
        }
        return env('APPDATA')!.split(path.sep)!.join(path.posix.sep)
    }
    get database(): string {
        return path.join(
            this.configPath!,
            `${this.appName}_${APP_VERSION}.sqlite`,
        )
    }

    get setting(): string {
        return path.join(this.configPath!, `${this.appName}.json`)
    }

    get schema(): string {
        return path.join(
            this.configPath!,
            `${this.appName}-settings-schema.json`,
        )
    }
}

export const dataPath = new DataPathConfig()
