# src/llm/

> L2 | 父级: /AGENTS.md

LLM 层——Pi Agent 封装、工具注册、终端显示、MCP 客户端。所有 AI 通信和工具执行流经此模块。

## 成员清单

- **base.ts**: Pi SDK 唯一导入边界，集中重导出 ifcli 使用的 `pi-ai`/`pi-agent-core` 值与类型，含各协议实现工厂（openAICompletionsApi/anthropicMessagesApi 等）与 `createProvider`/`envApiKeyAuth`；业务模块禁止直连上游包。
- **pi-types.ts**: 领域类型定义，经 `base.ts` 获取 Pi 类型并定义 SessionEntry/SessionStorage/ChatConfig/CustomToolDef/PiDisplayEvent。整个项目的类型基石。
- **agent-runner.ts**: Pi Agent 运行器。封装 `Agent` 类，接收 Model/Tools/SystemPrompt/ThinkingLevel 配置与外部注入的 `streamFn`，将 Pi 的 AgentEvent 和 AssistantMessageEvent 两级事件转换为统一的 PiDisplayEvent 流。流函数由 ChatService 注入 `models.streamSimple`，使内置与自定义 provider 走同一套 Models 鉴权；替代旧 ask-flow.ts + open-ai-helper.ts。
- **custom-providers.ts**: 自定义 provider 注册器。把 `settings.providers`（api 协议名 + baseUrl + 模型声明）经 `createProvider`/`envApiKeyAuth` 映射注册进 Pi Models，在 getAvailable 之前调用；模型声明支持 `reasoning`/`thinkingLevelMap`/`compat` 透传（推理模型需配 `compat.thinkingFormat` 才能在 thinkingLevel=off 时下发关闭思考参数）；单个 provider 配置错误降级为跳过告警、同名 id 覆盖时输出告警，均不影响启动。协议名→工厂的映射表在此文件集中维护。
- **generate-session-name.ts**: 轻量模型调用，使用调用方传入的 Models 集合（内置 + 自定义 provider）把首轮用户意图压缩为会话短名称。
- **tool-registry.ts**: 工具注册表。将 MCP 客户端、自定义工具和 skills 目录下的 SKILL.md 统一注册为 Pi `AgentTool<any>`；skill 支持返回目录文件列表及通过 `command="<skill>:<relative-path>"` 读取 skill 内文件。提供分组发现机制（list_available_tool_groups / list_available_tools）和 skill 列表（availableSkills）。`group` 字段已改为 `tags`（数组，支持多标签）。替代旧 tool.ts。
- **pi-display-handler.ts**: Pi 事件 → 终端输出。围绕 Pi SSE 事件（text_delta/thinking_delta/toolcall_start/done/error）定义色板状态机，使用 chalk + ora 渲染。替代旧 simplified-display.ts + display-output-handler.ts。
- **mcp-client.ts**: MCP 协议客户端。支持 stdio/sse/http 三种传输，负责连接生命周期和工具调用。保留自旧架构，适配 AgentTool 输出格式。
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
