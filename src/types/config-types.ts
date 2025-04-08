export interface IConfig {
    appName: () => string
    configPath: () => string | undefined
    dataPath: () => string
    platformConfigPath: () => string
}
