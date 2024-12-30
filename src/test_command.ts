import { Command } from "@commander-js/extra-typings"
import MCPClient from "./types/mcp-client"
import { client } from "./app-context"
import { print } from "./util/common-utils"

const progrem = new Command()

progrem.name("test").description("test command").version("v1.0.0")

progrem
  .command("mcp")
  .argument("<string>")
  .action(async (arg: string) => {
    const mcpClient = new MCPClient({
      type: ["tools"],
      name: "mcp",
      version: "v1.0.0",
      command: "node",
      args: ["D:/workspace/other/weather/build/index.js"],
    })
    try {
      await mcpClient.connect()
      const tools = await mcpClient.listTools()
      tools.tools.forEach((it) => {
        console.log(it.name)
        console.log(it.description)
        console.log(it.inputSchema)
      })

      // await client.callWithTools(
      //   [mcpClient],
      //   [client.user(arg)],
      //   client.chatModel(),
      //   1.0,
      //   print,
      // )
      console.log(await mcpClient.callTool("get-alerts", { state: "NY" }))
    } catch (err: unknown) {
      console.error(err)
    }
    await mcpClient.close()
  })

progrem.parseAsync()
