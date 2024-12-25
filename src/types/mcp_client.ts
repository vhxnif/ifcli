import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

export type MCPConfig = {
  name: string
  version: string
  command: string
  args?: string[]
  env?: Record<string, string>
}

export default class MCPClient {
  private name: string
  private version: string
  private client: Client
  private transport: StdioClientTransport

  constructor(cf: MCPConfig) {
    this.name = cf.name
    this.version = cf.version
    this.client = new Client(
      {
        name: this.name,
        version: this.version,
      },
      { capabilities: {} },
    )
    this.transport = new StdioClientTransport({
      command: cf.command,
      args: cf.args,
      env: cf.env,
    })
  }

  connect = async () => await this.client.connect(this.transport)

  close = async () => await this.client.close()

  listTools = async () => await this.client.listTools()

  callTool = async (name: string, args: any) =>
    await this.client.callTool({ name, arguments: { ...args } })
}
