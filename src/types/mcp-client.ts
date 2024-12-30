import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"

export type MCPClientType = "tools" | "prompt" | "resource"

export type MCPConfig = {
  type: MCPClientType[]
  name: string
  version: string
  command: string
  args?: string[]
  env?: Record<string, string>
}

export default class MCPClient {
  type: MCPClientType[]
  name: string
  version: string
  client: Client
  transport: StdioClientTransport
  constructor(config: MCPConfig) {
    this.type = config.type
    this.name = config.name
    this.version = config.version
    this.client = new Client(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {},
      },
    )
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    })
  }

  connect = async () => await this.client.connect(this.transport)

  listTools = async () => await this.client.listTools()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callTool = async (name: string, args: any) =>
    await this.client.callTool(
      { name, arguments: { ...args } },
      CallToolResultSchema,
    )
  close = async () => await this.client.close()
}
