/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import type { IConfig } from '../types/config-types'
import { accessSync, constants, mkdirSync } from 'node:fs'
import { env, platform } from '../util/platform-utils'

export class AppConfig implements IConfig {
    appName = (): string => 'ifcli'
    configPath = (): string | undefined => {
        const platformConfigPath = this.platformConfigPath()
        const appName = this.appName()
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
    platformConfigPath = (): string => {
        if (!['win32', 'linux', 'darwin'].includes(platform)) {
            throw Error(`${platform} not supported.`)
        }
        let pt = env('APPDATA')!
        if (['linux', 'darwin'].includes(platform)) {
            pt = `${env('HOME')}${path.sep}.config`
        }
        return pt
    }
    dataPath = (): string =>
        `${this.configPath()}${path.sep}${this.appName()}.sqlite`

    mcpConfigPath = (): string =>
        path.join(this.platformConfigPath(), this.appName(), 'mcp.json')
}
