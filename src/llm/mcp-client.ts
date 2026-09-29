/**
 * [INPUT]: 依赖 MCP SDK 的客户端、传输与结果 schema，依赖 ./base 集中提供的 Pi Tool 类型
 * [OUTPUT]: MCPClient 及 stdio/SSE/HTTP 连接配置类型，把 MCP 工具适配为 Pi 工具描述
 * [POS]: src/llm/ 的外部工具协议适配器，被 ToolRegistry 创建并管理连接生命周期
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

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
import { println } from '../util/common-utils'
import type { Tool } from './base'

export type MCPConnectType = 'http' | 'sse' | 'stdio'

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

export type MCPLogMode = 'ignore' | 'inherit' | 'file'

export interface StdioConfig extends MCPConfig {
    type: 'stdio'
    params: StdioServerParameters
    logMode?: MCPLogMode
}

export interface HttpConfig extends MCPConfig {
    type: 'http'
    url: string
    opts?: StreamableHTTPClientTransportOptions
}

export default class MCPClient {
    name: string
    version: string
    client: Client
    transport: Transport
    private connected: boolean = false
    private connectionError: Error | null = null

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
            },
        )
        if (config.type === 'stdio') {
            const { logMode, params } = config as StdioConfig
            const stderr = this.getStderrConfig(logMode)
            this.transport = new StdioClientTransport({
                ...params,
                stderr,
            })
            return
        }
        if (config.type === 'http') {
            const { url, opts } = config as HttpConfig
            this.transport = new StreamableHTTPClientTransport(
                new URL(url),
                opts,
            )
            return
        }
        if (config.type === 'sse') {
            const { url, opts } = config as SSEConfig
            this.transport = new SSEClientTransport(new URL(url), opts)
            return
        }
        throw new Error(`The ${config.type} MCP transport not supported`)
    }

    private getStderrConfig(
        logMode?: MCPLogMode,
    ): 'inherit' | 'ignore' | 'pipe' {
        if (logMode === 'inherit') {
            return 'inherit'
        }
        if (logMode === 'ignore') {
            return 'ignore'
        }
        if (logMode === 'file') {
            return 'pipe'
        }
        return 'pipe'
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect(this.transport)
            this.connected = true
            this.connectionError = null
        } catch (e: unknown) {
            this.connected = false
            this.connectionError = e instanceof Error ? e : new Error(String(e))
            println(
                `${this.name}/${this.version} connect error: ${this.connectionError.message}`,
            )
        }
    }

    get isConnected() {
        return this.connected
    }

    get connectionErr() {
        return this.connectionError
    }

    async listTools() {
        return await this.client.listTools()
    }

    async tools() {
        if (!this.connected) {
            return []
        }
        return await this.listTools().then((res) =>
            res.tools.map((t) => {
                return {
                    name: `${t.name}`,
                    description: t.description,
                    parameters: {
                        ...t.inputSchema,
                    },
                } as Tool
            }),
        )
    }

    async callTool(name: string, args: any) {
        return await this.client.callTool(
            { name, arguments: { ...args } },
            CallToolResultSchema,
        )
    }

    async close() {
        try {
            if (this.connected) {
                await this.client.close()
                this.connected = false
            } else {
                await this.transport.close()
            }
        } catch (_e: unknown) {
            println(`${this.name}/${this.version} close error.`)
        }
    }
}
