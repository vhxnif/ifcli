/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import { env, platform } from '../util/config-utils'
import type { IConfig } from '../types/config-types'
import { accessSync, constants, mkdirSync } from 'node:fs'

export class AppConfig implements IConfig {
    defaultModel = (): string => env('IFCLI_DEFAULT_MODEL') ?? 'deepseek-chat'
    customeModels = () => {
        const customModels = env('IFCLI_CUSTOM_MODELS')
        if (customModels) {
            return customModels?.split(',').map(it => it.trim())
        }
        return []
    }
    appName = (): string => env('IFCLI_APP_NAME') ?? 'ifcli'
    baseURL = (): string => env('OPENAI_BASE_URL') ?? 'https://api.deepseek.com'
    apiKey = (): string => env('OPENAI_API_KEY')!
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
    models = (): string[] =>
        [...this.customeModels(), this.defaultModel()].reduce((arr, it) => {
            if (!arr.includes(it)) {
                arr.push(it)
            }
            return arr
        }, [] as string[])
    terminalColumns = (): number => process.stdout.columns
    terminalRows = (): number => process.stdout.rows
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
    mcpConfigPath = (): string | null => {
        let mcp: string | null =
            `${this.platformConfigPath()}${path.sep}${this.appName()}${path.sep}mcp.json`
        try {
            accessSync(mcp, constants.F_OK)
        } catch (err: any) {
            mcp = null
        }
        return mcp
    }
}
