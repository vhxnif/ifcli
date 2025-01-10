export interface IConfig {
  defaultModel: () => string
  models: () => string[]
  appName: () => string
  baseURL: () => string
  apiKey: () => string
  configPath: () => string | undefined
  dataPath: () => string
  models: () => string[]
  terminalColumns: () => number
  terminalRows: () => number
  platformConfigPath: () => string | undefined
  mcpConfigPath: () => string | null
}
