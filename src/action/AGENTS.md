# src/action/

> L2 | 父级: /AGENTS.md

服务编排层——将 AgentRunner、ToolRegistry、SessionStorage、Display 组装成完整聊天流程，对外暴露高层 CLI 可调用的操作。

## 成员清单

- **chat-service.ts**: 聊天编排核心。封装 agent/session CRUD、active agent 读写透传、模型解析、工具构建（透传 agent skills）、上下文构建、自动命名入口；`runChat` 方法串联 AgentRunner → DisplayHandler → Storage 的完整对话循环。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
