export interface IConfig {
    commonModel: string
    coderModel: string 
    appName: string
    baseURL: string 
    apiKey: string
    configPath: () => string | undefined 
    dataPath: string 
    models: string[]
}

