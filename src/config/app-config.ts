/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { env, platform } from "../util/config-utils"
import type { IConfig } from "../types/config-types"
import { accessSync, mkdirSync, constants } from "node:fs"

export class AppConfig implements IConfig {
  commonModel = () => env("CHAT_MODEL") ?? "deepseek-chat"
  coderModel = () => env("CODER_MODEL") ?? "deepseek-coder"
  appName = () => env("OPENAI_APP_NAME") ?? "ifcli"
  baseURL = () => env("OPENAI_BASE_URL") ?? "https://api.deepseek.com"
  apiKey = () => env("OPENAI_API_KEY")!
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
  dataPath = () => `${this.configPath()}${path.sep}${this.appName}.sqlite`
  models = () => [this.coderModel(), this.commonModel()]
  terminalColumns = () => process.stdout.columns
  terminalRows = () => process.stdout.rows
  platformConfigPath = () => {
    if (!["win32", "linux", "darwin"].includes(platform)) {
      throw Error(`${platform} not supported.`)
    }
    let pt = env("APPDATA")
    if (["linux", "darwin"].includes(platform)) {
      pt = `${env("HOME")}${path.sep}.config`
    }
    return pt
  }
  mcpConfigPath = () => {
    let mcp: string | null =
      `${this.platformConfigPath()}${path.sep}${this.appName()}.sqlite`
    try {
      accessSync(mcp, constants.F_OK)
    } catch (err: any) {
      mcp = null
    }
    return mcp
  }
}
