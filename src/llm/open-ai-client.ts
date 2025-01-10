/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAi from "openai"
import type { IConfig } from "../types/config-types"
import type { ILLMClient, LLMMessage, LLMRole } from "../types/llm-types"
import MCPClient from "../types/mcp-client"
import type { MCPConfig } from "../types/mcp-client"
import type { RunnableToolFunction } from "openai/lib/RunnableFunction"
import ora from "ora"
import { log } from "../util/common-utils"
import { accessSync, constants, readFileSync } from "node:fs"

export class OpenAiClient implements ILLMClient {
  client: OpenAi
  private config: IConfig
  private usefulTools: MCPClient[]
  constructor(config: IConfig) {
    this.config = config
    this.client = new OpenAi({
      baseURL: config.baseURL(),
      apiKey: config.apiKey(),
    })
    const tools = () => {
      try {
        const mcpPath = this.config.mcpConfigPath()
        if (!mcpPath) {
          return []
        }
        accessSync(mcpPath, constants.F_OK)
        const data = readFileSync(mcpPath, "utf-8")
        const mcpConfigs = JSON.parse(data) as MCPConfig[]
        return mcpConfigs.map((it) => new MCPClient(it))
      } catch (err: unknown) {
        return []
      }
    }
    this.usefulTools = tools()
  }

  tools = () => this.usefulTools

  coderModel = () => this.config.coderModel()
  chatModel = () => this.config.commonModel()
  models = () => this.config.models()

  user = (content: string): LLMMessage => this.message("user", content)

  system = (content: string): LLMMessage => this.message("system", content)

  assistant = (content: string): LLMMessage =>
    this.message("assistant", content)

  call = async (
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => {
    await this.client.chat.completions
      .create({
        messages: messages,
        model: model,
        temperature,
      })
      .then((it) => f(it.choices[0]?.message?.content ?? ""))
      .catch((err) => console.error(err))
  }
  stream = async (
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => {
    const runner = this.client.beta.chat.completions
      .stream({
        model,
        messages,
        temperature,
      })
      .on("content", f)
    await runner.finalChatCompletion()
  }

  callWithTools = async (
    mcpClients: MCPClient[],
    messages: LLMMessage[],
    model: string,
    temperature: number,
    f: (res: string) => void,
  ) => {
    // support tools mcp server now
    const actMcpClients = mcpClients.filter((it) => it.type.includes("tools"))
    try {
      await Promise.all(actMcpClients.map((it) => it.connect()))
      const spinner = ora("thinking...").start()
      // map to openai tools
      const tools = (
        await Promise.all(actMcpClients.flatMap((it) => this.mapToTools(it)))
      ).flat()
      let isStop = false
      // call llm
      const runner = this.client.beta.chat.completions
        .runTools({
          model,
          temperature,
          stream: true,
          tools,
          messages,
        })
        .on("functionCall", (it) => {
          spinner.text = `call ${it.name}... args: ${it.arguments}`
        })
        .on("functionCallResult", (it) => {
          spinner.text = `part result ${it} processing...`
        })
        .on("content", (it) => {
          if (!isStop) {
            spinner.stop()
            isStop = true
          }
          f(it)
        })
      await runner.finalChatCompletion()
    } catch (err: unknown) {
      console.error(err)
      await Promise.all(actMcpClients.map((it) => it.close()))
    }
    await Promise.all(actMcpClients.map((it) => it.close()))
  }

  private mapToTools = async (mcp: MCPClient) =>
    await mcp.listTools().then((res) =>
      res.tools.map(
        (t) =>
          ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: {
                ...t.inputSchema,
              },
              function: async (args: any) => await mcp.callTool(t.name, args),
              parse: JSON.parse,
            },
          }) as RunnableToolFunction<any>,
      ),
    )

  private message = (role: LLMRole, content: string): LLMMessage => ({
    role,
    content,
  })
}
