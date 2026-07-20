/**
 * [INPUT]: 依赖 node:fs 的 accessSync/mkdirSync，依赖 node:path，依赖 ../util/platform-utils 的平台信息
 * [OUTPUT]: DataPathConfig 类（settings/settingsSchema/database/legacy 路径）
 * [POS]: src/config/ 的路径解析器，被 app-setting.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { accessSync, constants, mkdirSync } from 'node:fs'
import path from 'node:path'
import { env, platform } from '../util/platform-utils'

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
        return path.join(this.configPath!, 'data.sqlite')
    }

    get settings(): string {
        return path.join(this.configPath!, 'settings.json')
    }

    get settingsSchema(): string {
        return path.join(this.configPath!, 'settings-schema.json')
    }
}

export const dataPath = new DataPathConfig()
