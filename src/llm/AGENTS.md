# src/llm/

> L2 | 父级: /AGENTS.md

LLM 层——Pi Agent 封装、工具注册、终端显示、MCP 客户端。所有 AI 通信和工具执行流经此模块。

## 成员清单

- **pi-types.ts**: 核心类型定义，重导出 `@earendil-works/pi-ai` 和 `@earendil-works/pi-agent-core` 的 Message/Model/AgentTool/ThinkingLevel 等类型，定义 SessionEntry/SessionStorage/ChatConfig/PiDisplayEvent 等自定义类型。整个项目的类型基石。
- **agent-runner.ts**: Pi Agent 运行器。封装 `Agent` 类，接收 Model/Tools/SystemPrompt/ThinkingLevel 配置，将 Pi 的 AgentEvent 和 AssistantMessageEvent 两级事件转换为统一的 PiDisplayEvent 流。替代旧 ask-flow.ts + open-ai-helper.ts。
- **pi-display-handler.ts**: Pi 事件 → 终端输出。围绕 Pi SSE 事件（text_delta/thinking_delta/toolcall_start/done/error）定义色板状态机，使用 chalk + ora 渲染。替代旧 simplified-display.ts + display-output-handler.ts。
- **tool-registry.ts**: 工具注册表。将 MCP 客户端、自定义工具和 skills 目录下的 SKILL.md 统一注册为 Pi `AgentTool<any>`；提供分组发现机制（list_available_tool_groups / list_available_tools）和 skill 列表（availableSkills）。`group` 字段已改为 `tags`（数组，支持多标签）。替代旧 tool.ts。
- **mcp-client.ts**: MCP 协议客户端。支持 stdio/sse/http 三种传输，负责连接生命周期和工具调用。保留自旧架构，适配 AgentTool 输出格式。
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
