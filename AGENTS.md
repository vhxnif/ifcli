# ifcli — Pi 驱动的 CLI 聊天工具

> L1 | 技术栈: Bun + TypeScript + @earendil-works/pi-ai + @earendil-works/pi-agent-core + SQLite + Commander

基于 [Pi agent harness](https://github.com/earendil-works/pi) 重新构建的交互式 AI 聊天 CLI。模型由 Pi 环境变量自动发现，会话以 Pi Session 树形结构存储在 SQLite 中，上下文通过 compaction 自动管理。

## 技术栈

| 层 | 技术 | 用途 |
|----|------|------|
| 运行时 | Bun ≥1.2.6 | 打包、运行、SQLite |
| 语言 | TypeScript 5.9 | 类型安全 |
| LLM | @earendil-works/pi-ai ^0.87.1 | 多供应商统一 API（pi-messages / OpenAI / Anthropic） |
| Agent | @earendil-works/pi-agent-core ^0.87.1 | Agent 运行时、SessionStorage 接口 |
| 存储 | bun:sqlite | 树形 session 存储 |
| CLI | commander ^13 | 命令解析 |
| UI | chalk ^5 / ora ^8 / inquirer ^4 | 终端颜色、spinner、交互选择 |
| MCP | @modelcontextprotocol/sdk ^1.11 | Model Context Protocol 工具 |

## 目录

```
src/
├── chat-command.ts        — CLI 入口: ict (ifchat)
├── setting-command.ts     — CLI 入口: ist (ifsetting)
├── app-context.ts         — 应用组装入口，连线所有服务
├── llm/                   — LLM 层 (7 文件)
│   ├── base.ts            — Pi SDK 唯一导入边界
│   ├── pi-types.ts        — 领域类型定义（Pi 类型 + 自定义类型）
│   ├── agent-runner.ts    — Pi Agent 封装（替代 ask-flow）
│   ├── generate-session-name.ts — 会话自动命名
│   ├── pi-display-handler.ts — Pi 事件 → 终端渲染（替代 simplified-display）
│   ├── tool-registry.ts   — MCP + Custom → AgentTool 注册（替代 tool.ts）
│   └── mcp-client.ts      — MCP 协议客户端（保留自旧架构）
├── store/                 — 存储层 (3 文件)
│   ├── schema.ts          — SQLite 数据库结构定义
│   ├── session-storage.ts — SQLite 实现 Pi SessionStorage 接口（树形）
│   └── agent-manager.ts — agent/session 两层生命周期管理
├── action/                — 服务层 (1 文件)
│   └── chat-service.ts    — 聊天编排服务（Session + Agent + Display + Tool）
├── config/                — 配置层 (4 文件)
│   ├── app-setting.ts     — 功能配置类型与读写
│   ├── data-config.ts     — 数据路径解析
│   ├── setting-validator.ts — JSON Schema 校验
│   └── prompt-message.ts  — 提示文案常量
├── component/             — UI 组件 (4 业务文件 + theme/)
│   ├── agent-history-show.ts — Pi 消息历史渲染
│   ├── chat-history.ts    — 紧凑聊天历史渲染
│   ├── ora-show.ts        — Ora spinner 封装
│   ├── properties-show.ts — 配置属性渲染
│   └── theme/             — 主题色板 (5 文件)
└── util/                  — 工具函数 (5 文件)
```

## 配置

```json
{
  "generalSetting": { "theme": "Tokyo Night" },
  "session": { "autoName": { "enabled": true, "model": "openai/gpt-4o-mini" } },
  "compaction": { "enabled": true, "triggerRatio": 0.8, "keepRecentRatio": 0.3 },
  "mcpServers": [...],
  "customTools": [...]
}
```

模型供应商由 Pi 环境变量自动发现，不写入配置文件。

## 架构

```
CLI (chat-command / setting-command)
  └─ AppContext (连线)
       ├─ ChatService (编排) → AgentManager, AgentRunner, ToolRegistry, PiDisplayHandler
       ├─ Config (功能配置)
       └─ Pi Models (环境变量发现供应商)
```

Skill 扩展: 将 SKILL.md 放入 `~/.config/ifcli/skills/<skill>/` 目录，然后在 `ict config -k` 中为 agent 启用，即可通过 `Skill` tool 调用。

扩展点: SessionStorage 接口、StreamFn、transformContext hook、AgentTool<any>、PiDisplayHandler。
