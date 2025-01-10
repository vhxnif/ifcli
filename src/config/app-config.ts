/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path'
import { env, platform } from '../util/config-utils'
import type { IConfig } from '../types/config-types'
import { accessSync, mkdirSync, constants } from 'node:fs'

export class AppConfig implements IConfig {
    defaultModel = () => env('IFCLI_DEFAULT_MODEL') ?? 'deepseek-chat'
    models = () => {
        const modelsConfig = env('IFCLI_MODELS')
        if (modelsConfig) {
            return [
                ...modelsConfig.split(',').map((it) => it.trim()),
                this.defaultModel(),
            ].reduce((arr, it) => {
                if (!arr.includes(it)) {
                    arr.push(it)
                }
                return arr
            }, [] as string[])
        }
        return [this.defaultModel()]
    }
    appName = () => 'ifcli'
    baseURL = () => env('OPENAI_BASE_URL') ?? 'https://api.deepseek.com'
    apiKey = () => env('OPENAI_API_KEY')!
    configPath = (): string | undefined => {
        const platformPath = this.platformConfigPath()!
        const appName = this.appName()
        const appConfig = `${platformPath}${path.sep}${appName}`
        try {
            accessSync(platformPath, constants.F_OK)
        } catch (err: any) {
            throw Error(`platform ${platform} configPath missing.`)
        }
        try {
            accessSync(appConfig, constants.F_OK)
            return appConfig
        } catch (err: any) {
            mkdirSync(appConfig, { recursive: true })
            return appConfig
        }
    }
    dataPath = () => `${this.configPath()}${path.sep}${this.appName()}.sqlite`
    terminalColumns = () => process.stdout.columns
    terminalRows = () => process.stdout.rows
    platformConfigPath = () => {
        if (!['win32', 'linux', 'darwin'].includes(platform)) {
            throw Error(`${platform} not supported.`)
        }
        let pt = env('APPDATA')
        if (['linux', 'darwin'].includes(platform)) {
            pt = `${env('HOME')}${path.sep}.config`
        }
        return pt
    }
    mcpConfigPath = () => {
        let mcp: string | null = `${this.configPath()}${path.sep}mcp.json`
        try {
            accessSync(mcp, constants.F_OK)
        } catch (err: any) {
            mcp = null
        }
        return mcp
    }
}
