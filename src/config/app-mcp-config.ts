import type { IConfig } from "../types/config-types"
import type { MCPConfig } from "../types/mcp-client"
import MCPClient from "../types/mcp-client"


export class AppMCPConfig {
    private readonly appConfig : IConfig
    constructor(appConfig: IConfig) {
        this.appConfig = appConfig
    }

    clients = async () => {
        const file = Bun.file(this.appConfig.mcpConfigPath())
        if(!(await file.exists())) {
            return []
        }
        const data = await file.text()
        const mcpConfigs = JSON.parse(data) as MCPConfig[]
        return mcpConfigs.map((it) => new MCPClient(it))
    }

}