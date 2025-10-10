/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
    SSEClientTransport,
    type SSEClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/sse.js'
import {
    StdioClientTransport,
    type StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js'
import {
    StreamableHTTPClientTransport,
    type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import type { RunnableToolFunction } from 'openai/lib/RunnableFunction.mjs'
import { println, uuid } from '../util/common-utils'

export type MCPConnectType = 'streamable' | 'sse' | 'stdio'

export interface MCPConfig {
    name: string
    version: string
    enable: boolean
    type: MCPConnectType
}

export interface SSEConfig extends MCPConfig {
    type: 'sse'
    url: string
    opts?: SSEClientTransportOptions
}

export interface StdioConfig extends MCPConfig {
    type: 'stdio'
    params: StdioServerParameters
}

export interface StreamableConfig extends MCPConfig {
    type: 'streamable'
    url: string
    opts?: StreamableHTTPClientTransportOptions
}

export default class MCPClient {
    name: string
    version: string
    client: Client
    transport: Transport
    private connected: boolean = false
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
                    tools: {},
                },
            }
        )
        if (config.type === 'stdio') {
            this.transport = new StdioClientTransport({
                ...(config as StdioConfig).params,
            })
            return
        }
        const { url, opts } = config as SSEConfig
        if (config.type === 'streamable') {
            this.transport = new StreamableHTTPClientTransport(
                new URL(url),
                opts
            )
            return
        }
        this.transport = new SSEClientTransport(new URL(url), opts)
    }

    connect = async () => {
        try {
            await this.client.connect(this.transport)
            this.connected = true
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
            println(`${this.name}/${this.version} connect error.`)
        }
    }

    listTools = async () => await this.client.listTools()

    tools = async () => {
        if (!this.connected) {
            return []
        }
        return await this.listTools().then((res) =>
            res.tools.map((t) => {
                const nameId = uuid()
                const f = {
                    type: 'function',
                    function: {
                        name: nameId,
                        description: t.description,
                        parameters: {
                            ...t.inputSchema,
                        },
                        function: async (args: any) =>
                            await this.callTool(t.name, args),
                        parse: JSON.parse,
                    },
                } as RunnableToolFunction<any>
                return {
                    id: nameId,
                    mcpServer: this.name,
                    mcpVersion: this.version,
                    funName: t.name,
                    f: f,
                }
            })
        )
    }

    callTool = async (name: string, args: any) =>
        await this.client.callTool(
            { name, arguments: { ...args } },
            CallToolResultSchema
        )

    close = async () => {
        try {
            if (this.connected) {
                await this.client.close()
                this.connected = false
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
            println(`${this.name}/${this.version} close error.`)
        }
    }
}
