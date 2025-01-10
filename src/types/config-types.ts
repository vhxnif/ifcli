export interface IConfig {
  defaultModel: () => string
  customeModels: () => string[]
  appName: () => string
  baseURL: () => string
  apiKey: () => string
  configPath: () => string | undefined
  dataPath: () => string
  models: () => string[]
  terminalColumns: () => number
  terminalRows: () => number
  platformConfigPath: () => string
  mcpConfigPath: () => string | null
}
