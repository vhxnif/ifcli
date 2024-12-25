#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings"
import MCPClient from "./types/mcp_client"
import { client } from "./app-context"
import { print } from "./util/common-utils"

const program = new Command()

program.name("mcp").description("mcp test").version("0.1.0")

program
  .command("mcp")
  .description("mcp test")
  .argument("<string>")
  .action(async (content) => {
    const mcp = new MCPClient({
      name: "weather",
      version: "v1",
      command: "bun",
      args: ["/Users/chen/workspace/mcp_server/src/index.ts"],
    })
    await client.callWithTools(
      [mcp],
      [client.user(content)],
      client.chatModel(),
      1.0,
      print,
    )
  })

program.parseAsync()
