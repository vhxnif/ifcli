# src/llm/

> L2 | 父级: /AGENTS.md

LLM 层——Pi Agent 封装、工具注册、终端显示、MCP 客户端。所有 AI 通信和工具执行流经此模块。

## 成员清单

- **base.ts**: Pi SDK 唯一导入边界，集中重导出 ifcli 使用的 `pi-ai`/`pi-agent-core` 值与类型；业务模块禁止直连上游包。
- **pi-types.ts**: 领域类型定义，经 `base.ts` 获取 Pi 类型并定义 SessionEntry/SessionStorage/ChatConfig/CustomToolDef/PiDisplayEvent。整个项目的类型基石。
- **agent-runner.ts**: Pi Agent 运行器。封装 `Agent` 类，接收 Model/Tools/SystemPrompt/ThinkingLevel 配置，将 Pi 的 AgentEvent 和 AssistantMessageEvent 两级事件转换为统一的 PiDisplayEvent 流。替代旧 ask-flow.ts + open-ai-helper.ts。
- **generate-session-name.ts**: 轻量模型调用，使用内置 Models 注册表把首轮用户意图压缩为会话短名称。
- **pi-display-handler.ts**: Pi 事件 → 终端输出。围绕 Pi SSE 事件（text_delta/thinking_delta/toolcall_start/done/error）定义色板状态机，使用 chalk + ora 渲染。替代旧 simplified-display.ts + display-output-handler.ts。
- **tool-registry.ts**: 工具注册表。将 MCP 客户端、自定义工具和 skills 目录下的 SKILL.md 统一注册为 Pi `AgentTool<any>`；skill 支持返回目录文件列表及通过 `command="<skill>:<relative-path>"` 读取 skill 内文件。提供分组发现机制（list_available_tool_groups / list_available_tools）和 skill 列表（availableSkills）。`group` 字段已改为 `tags`（数组，支持多标签）。替代旧 tool.ts。
- **mcp-client.ts**: MCP 协议客户端。支持 stdio/sse/http 三种传输，负责连接生命周期和工具调用。保留自旧架构，适配 AgentTool 输出格式。
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
