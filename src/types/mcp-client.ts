import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport, type SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport, type StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

export type MCPConnectType = 'sse' | 'stdio'

export interface MCPConfig {
    name: string
    version: string
    type: MCPConnectType
}

export interface SSEConfig extends MCPConfig {
    type: 'sse'
    url: string
    opts?: SSEClientTransportOptions
}

export interface StdioConfig extends MCPConfig {
    type: 'stdio'
    params : StdioServerParameters
}

export default class MCPClient {
    name: string
    version: string
    client: Client
    transport: Transport
    constructor(config: MCPConfig) {
        this.name = config.name
        this.version = config.version
        this.client = new Client(
            {
                name: this.name,
                version: this.version,
            },
            {
                capabilities: {
                  tools: {}
                },
            }
        )
        if (config.type === 'stdio') {
            this.transport = new StdioClientTransport({
                ...(config as StdioConfig).params,
            })
            return
        }
        const { url, opts} = config as SSEConfig
        this.transport = new SSEClientTransport(
            new URL(url),
            opts
        )
    }

    connect = async () => await this.client.connect(this.transport)

    listTools = async () => await this.client.listTools()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callTool = async (name: string, args: any) =>
        await this.client.callTool(
            { name, arguments: { ...args } },
            CallToolResultSchema
        )
    close = async () => await this.client.close()
}
