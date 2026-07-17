# Pi 架构重新设计方案

## 背景

将 ifcli 底层从 OpenAI 完全迁移到 [Pi](https://github.com/earendil-works/pi)，围绕 Pi 的 agent harness 重新设计架构，**不局限于现有实现，只保留功能需求**。

技术栈升级：
- TypeScript 7.0（`typescript@^7.0`，更快编译、更好类型推断）
- Bun 最新版（runtime & bundler）
- Pi 全家桶最新版（`@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`）
- 其他依赖跟随升级（commander、inquirer 等保持最新）

现有功能清单（保留）：
- CLI 交互式聊天（流式输出、thinking 展示、tool call 可视化）
- 多会话管理（chats）、会话内话题（topics）
- MCP 工具集成、自定义工具
- 预设消息、系统提示词、场景温度
- 配置管理、主题、历史查看、导出

---

## Pi 核心概念

| Pi 概念 | 说明 |
|---------|------|
| `Session` | 树形会话存储，entries 形成 DAG（parentId 关联） |
| `SessionTreeEntry` | 会话树的节点：message / compaction / branch_summary / custom / model_change / ... |
| `Compaction` | 当 context token 接近上限时，将旧消息总结为一段摘要，只保留近期消息原文 |
| `Branch` | 树中的一条路径（从 root 到 leaf），天然支持多话题分支 |
| `Agent` | 有状态的 agent 运行时：管理 messages、tools、systemPrompt、流式请求、tool 执行循环 |
| `Models` + `streamSimple` | 统一多供应商 LLM API（支持 pi-messages、OpenAI、Anthropic 等） |

---

## 架构映射

| 当前 ifcli | 新设计（Pi） |
|-----------|-------------|
| Chat（会话） | Pi `Session`（一个 session 就是一个 chat） |
| Topic（话题） | Session 树中的 branch / leaf |
| Message | `SessionTreeEntry`（type: message）+ `AgentMessage` |
| contextLimit 固定窗口 | Compaction 自动管理（token-based，无硬窗口） |
| `askFlow` + pocketflow | Pi `Agent` 或简化版 agent loop |
| `OpenAiClient` + `openai` npm | `@earendil-works/pi-ai` 的 `Models` + `streamSimple` |
| `open-ai-helper.ts`（stream/streamTools/messageReducer） | **删除** — Pi 内置处理 |
| `tool.ts`（ChatCompletionFunctionTool） | Pi `AgentTool` 类型 |
| SQLite 平面表 | SQLite 实现的 `SessionStorage` 接口（树形） |
| `reasoning` 作为独立 role | `thinking` 作为 assistant message 的 content block |
| `toolscall` 作为独立 role | `toolCall` content block + `toolResult` message |

---

## 新架构总览

```
                        ┌──────────────────────────────┐
                        │         CLI 入口               │
                        │  chat-command / setting-cmd   │
                        └──────────────┬───────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │               AppContext                         │
              │  ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
              │  │  Config  │ │  Theme    │ │ MCP Pool      │  │
              │  │ (功能配置)│ │ (Pi事件色)│ │ (连接生命周期)│  │
              │  └──────────┘ └───────────┘ └───────────────┘  │
              │                                                 │
              │         Pi Models (环境变量自动发现)              │
              │  ┌─────────────────────────────────────────┐   │
              │  │ openai/gpt-4o | anthropic/claude | ...  │   │
              │  │ deepseek/deepseek-chat | ...            │   │
              │  └─────────────────────────────────────────┘   │
              └───────────────────────┬─────────────────────┘
                                      │
              ┌───────────────────────┴─────────────────────────┐
              │              服务层                              │
              │                                                  │
              │  ┌────────────────┐  ┌──────────────────────┐   │
              │  │ SessionManager │  │ ChatOrchestrator      │   │
              │  │ · CRUD         │  │ · Agent 生命周期      │   │
              │  │ · 切换/分支    │  │ · 事件→渲染 桥接     │   │
              │  │ · 自动命名    │  │ · Compaction 触发     │   │
              │  │ · 迁移旧数据  │  │ · HTML 导出           │   │
              │  └───────┬────────┘  └──────────┬───────────┘   │
              │          │                       │               │
              └──────────┼───────────────────────┼───────────────┘
                         │                       │
              ┌──────────▼───────────┐ ┌─────────▼──────────┐
              │  SessionStorage      │ │  AgentRunner       │
              │  (SQLite实现         │ │  (Pi Agent封装)    │
              │   Pi接口)           │ │                    │
              │                     │ │  ┌──────────────┐  │
              │  接口可替换:         │ │  │ ToolRegistry │  │
              │  · SQLite (默认)    │ │  │ · MCP适配    │  │
              │  · JSONL            │ │  │ · Custom适配 │  │
              │  · Memory           │ │  └──────────────┘  │
              └─────────────────────┘ │                    │
                                      │  ┌──────────────┐  │
                                      │  │PiDisplay     │  │
                                      │  │· 事件→TUI    │  │
                                      │  │· 围绕Pi事件  │  │
                                      │  └──────────────┘  │
                                      └────────────────────┘
```

### 扩展点（抽象接口）

| 抽象 | 接口/类型 | 默认实现 | 扩展场景 |
|------|----------|---------|---------|
| **存储后端** | `SessionStorage`（Pi 接口） | `SqliteSessionStorage` | JSONL文件存储、PostgreSQL、远程同步 |
| **流式函数** | `StreamFn`（Pi 类型） | `streamSimple` | 自定义协议、负载均衡、请求日志 |
| **上下文变换** | `transformContext` hook | Compaction 实现 | 自定义裁剪策略、注入外部上下文、审计日志 |
| **工具注册** | `AgentTool<any>`（Pi 类型） | MCP + Custom | 新工具协议、Agent-to-Agent 通信 |
| **显示渲染** | `PiDisplayHandler` | 终端 TUI（基于 Pi 事件） | Web UI、通知推送、语音合成 |
| **模型选择** | `Model<Api>`（Pi 类型） | 用户选择 + session 绑定 | 自动路由、fallback 链、A/B 测试 |
| **会话命名** | `session.autoName` + nameModel | LLM 总结首条消息 | 自定义命名规则、手动命名 |
| **Compaction 策略** | `compactionRatio`（比例） | 80% contextWindow | 按消息数量、按时间、手动触发 |
| **导出格式** | `Exporter` 接口 | HTML | JSON、Markdown、PDF |

---

## 改动成本评估：改 vs 重写

### 建议重写（改动成本 ≥ 70% 代码量，不如全新写）

| 文件 | 当前行数 | 评估 | 原因 |
|------|---------|------|------|
| `src/llm/open-ai-helper.ts` | ~230 | **重写** → 删除 | 100% OpenAI chunk 格式，Pi 完全替代 |
| `src/llm/open-ai-client.ts` | ~20 | **重写** → 删除 | 简单 wrapper，无保留价值 |
| `src/llm/ask-flow.ts` | ~280 | **重写** → `agent-runner.ts` | pocketflow 管道 → Pi Agent loop，逻辑完全不同 |
| `src/llm/llm-types.ts` | ~60 | **重写** | 全部类型替换为 Pi 类型 |
| `src/llm/llm-utils.ts` | ~90 | **重写** | notify message 体系替换为 Pi 事件体系 |
| `src/llm/llm-constant.ts` | ~10 | **删除** | temperature 常量不再需要 |
| `src/llm/tool.ts` | ~160 | **重写** → `tool-registry.ts` | OpenAI 类型 → Pi AgentTool |
| `src/llm/topic-generator.ts` | ~50 | **重写** → 合并到 SessionManager | 简单 OpenAI 调用改为 Pi 调用，逻辑并入 |
| `src/store/db-client.ts` | ~440 | **重写** → `session-storage.ts` | 平面 CRUD → 树形 SessionStorage，接口完全不同 |
| `src/store/table-def.ts` | ~80 | **重写** → 内含于 session-storage | 完全不同的 schema |
| `src/store/store-types.ts` | ~220 | **重写** | 树形 entry 类型替代平面消息类型 |
| `src/store/store.ts` | ~240 | **重写** → `session-manager.ts` | 从 Store 模式改为 SessionManager |
| `src/component/simplified-display.ts` | ~200 | **重写** | 围绕 Pi 事件重新设计色板和状态机 |
| `src/component/display/display-output-handler.ts` | ~60 | **重写** | LLMOutputHandler → Pi 事件处理器 |
| `src/config/app-setting.ts` | ~100 | **重写** | 删除 LLMSetting[]，精简配置结构 |
| `src/action/chat-action.ts` | ~750 | **重写** → `chat-orchestrator.ts` | 最大文件，OpenAI 贯穿全篇 |

### 建议修改（核心逻辑可复用）

| 文件 | 行数 | 改动点 |
|------|------|--------|
| `src/llm/mcp-client.ts` | ~180 | 适配 `AgentTool` 输出格式（小改） |
| `src/chat-command.ts` | ~170 | CLI 参数不变，适配新服务接口 |
| `src/setting-command.ts` | ~80 | 配置命令适配精简配置 |
| `src/app-context.ts` | ~20 | 入口组装小幅调整 |
| `src/config/data-config.ts` | ~50 | 数据路径保留 |
| `src/config/setting-validator.ts` | ~100 | schema 更新 |
| `src/config/prompt-message.ts` | ~40 | 提示文案更新 |
| `src/component/ora-show.ts` | ~50 | 保留 |
| `src/util/*` | ~200 | 保留，可能新增 token 估算工具 |

### 总结

- **重写约 3000 行**（删除旧 + 写新），**修改约 900 行**
- 核心变更集中在 `src/llm/` 和 `src/store/`，CLI 层和工具层轻量适配
- 建议一次性重建 `src/llm/` + `src/store/`，不尝试增量迁移

---

## Phase 1: 数据存储重新设计

### 用 Session tree 代替平面表

**当前**：6 张平面表（chat, chat_topic, chat_message, chat_config, chat_config_ext, chat_preset_message），通过 JOIN 关联。

**新设计**：实现 Pi 的 `SessionStorage` 接口，底层用 SQLite 存储 tree entries。

```sql
-- 核心表：session（替代 chat）
CREATE TABLE session (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    metadata TEXT,          -- JSON: systemPrompt, model, etc.
    created_at INTEGER,
    updated_at INTEGER
);

-- 核心表：session_entry（替代 chat_message + chat_topic + ...）
CREATE TABLE session_entry (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT,         -- null = root, 形成树结构
    entry_type TEXT NOT NULL,  -- message, compaction, branch_summary, ...
    content TEXT,           -- JSON: AgentMessage 或 summary 文本
    "order" INTEGER,        -- 同 parent 下的顺序
    created_at INTEGER,
    FOREIGN KEY (session_id) REFERENCES session(id)
);

-- 辅助表：leaf（快速定位当前话题）
CREATE TABLE session_leaf (
    session_id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    label TEXT              -- 话题名称
);

-- 辅助表：label（entry 的标签/话题名）
CREATE TABLE entry_label (
    entry_id TEXT PRIMARY KEY,
    label TEXT NOT NULL
);
```

### Entry 类型

| entry_type | content 格式 | 对应 Pi 类型 |
|-----------|-------------|------------|
| `message` | `AgentMessage` JSON | `MessageEntry` |
| `compaction` | `{ summary, tokensBefore, firstKeptEntryId }` | `CompactionEntry` |
| `branch_summary` | `{ summary, fromId }` | `BranchSummaryEntry` |
| `model_change` | `{ provider, modelId }` | `ModelChangeEntry` |
| `system_prompt` | `{ prompt }` | custom |
| `label` | `{ label }` | `LabelEntry` |

### 为什么用树形结构？

1. **话题切换 = 分支切换**：每个话题是树的一个 leaf，切换话题就是移动到不同的 leaf
2. **Compaction 自洽**：compaction entry 是一个标记节点，context 构建时自动处理
3. **分支总结**：切换话题时，旧分支可自动生成 branch summary，回头时快速恢复上下文
4. **与 Pi agent harness 兼容**：可以直接对接 Pi 的 `Session` 类

---

## Phase 2: LLM 层替换

### 删除整个现有 LLM 层

| 删除 | 原因 |
|------|------|
| `src/llm/open-ai-client.ts` | Pi `Models` 替代 |
| `src/llm/open-ai-helper.ts` | Pi `streamSimple` 内置 |
| `src/llm/ask-flow.ts` | Pi `Agent` / agent loop 替代 |
| `src/llm/llm-types.ts` 中的 `ILLMClient` | Pi `Model` 类型 |
| `src/llm/topic-generator.ts` | 合并到 session 管理 |
| `src/llm/tool.ts` 中的 `ChatCompletionFunctionTool` | Pi `AgentTool` |

### 新 LLM 层

```
src/llm/
  models.ts          — Models 注册表封装，模型选择
  agent-runner.ts    — 基于 Pi Agent 的聊天运行器（替代 ask-flow）
  tool-registry.ts   — MCP 工具 + 自定义工具统一注册（替代 tool.ts）
```

`agent-runner.ts` 核心逻辑：

```ts
// 伪代码
async function runChat(session: Session, userInput: string, config: ChatConfig) {
    // 1. 构建 context（自动处理 compaction）
    const context = await session.buildContext();
    
    // 2. 创建 Agent
    const agent = new Agent({
        initialState: {
            messages: context.messages,
            systemPrompt: config.systemPrompt,
            tools: config.tools,
            model: config.model,
        },
        transformContext: compactionTransform(session),  // compaction hook
        streamFn: streamSimple,
    });
    
    // 3. 订阅事件 → 终端渲染
    agent.subscribe((event) => displayHandler.handle(event));
    
    // 4. 发送用户消息
    agent.steer({ role: "user", content: userInput });
    
    // 5. 保存新消息到 session
    // (在 agent_end 事件中)
}
```

---

## Phase 3: Context 管理 — Compaction 替代固定窗口

### Pi 的 compaction 机制

1. **触发条件**：`estimatedTokens > model.contextWindow - reserveTokens`（reserve 默认 16384）
2. **执行**：
   - 选中超过 `keepRecentTokens`（默认 20000）的旧消息
   - 调用 LLM 生成结构化摘要（Goal / Progress / Decisions / Next Steps）
   - 创建 `CompactionEntry`，包含 `summary`、`tokensBefore`、`firstKeptEntryId`
3. **Context 构建**：`defaultContextEntryTransform` 自动将 compaction 之前、`firstKeptEntryId` 之后的 entry 过滤掉，只保留 compaction 摘要 + 近期消息

### 对 ifcli 的适配

- 不需要用户配置 `contextLimit`
- `withContext` 开关改为 `enableCompaction`
- Compaction 在每次 LLM 请求前检查（可以在 `transformContext` hook 中实现）
- 摘要模型可配置（默认与聊天模型相同，也可选更便宜的模型）

---

## Phase 4: 消息类型简化

### 当前问题

```
role: "user" | "assistant" | "reasoning" | "toolscall"
```

`reasoning` 和 `toolscall` 是伪角色，存储了不属于"消息"的内容。

### 新设计（对齐 Pi）

```ts
// AgentMessage = UserMessage | AssistantMessage | ToolResultMessage | CompactionSummaryMessage | ...

type UserMessage = { role: "user", content: string | (TextContent | ImageContent)[] }

type AssistantMessage = {
    role: "assistant",
    content: (TextBlock | ThinkingBlock | ToolCallBlock)[]  // content blocks!
}

type ToolResultMessage = { role: "toolResult", content: ..., toolCallId: ..., ... }

// thinking 不再是独立 role，而是 assistant content 的一个 block
type ThinkingBlock = { type: "thinking", thinking: string, redacted?: boolean }
```

**存储**：整个 `AgentMessage` 作为 JSON 存入 `session_entry.content`。

---

## Phase 5: 配置重新设计

### 核心原则：Pi 管理模型供应商，ifcli 只管理功能配置

**模型供应商（由 Pi / 环境变量管理，不写入 ifcli 配置）**：
- Pi 的 `Models` 注册表自动从环境变量发现供应商：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`DEEPSEEK_API_KEY`、`PI_API_KEY` 等
- 无需在 ifcli 配置文件中写 baseUrl / apiKey / models 列表
- 用户设置环境变量后，Pi 自动发现可用供应商和模型

**ifcli 功能配置（只关注特定功能）**：

```json
{
  "general": {
    "theme": "Tokyo Night"
  },
  "session": {
    "autoName": {
      "enabled": true,
      "model": "openai/gpt-4o-mini"
    }
  },
  "compaction": {
    "enabled": true,
    "triggerRatio": 0.8,
    "keepRecentRatio": 0.3
  },
  "mcpServers": [
    {
      "name": "filesystem",
      "version": "1.0.0",
      "enable": true,
      "type": "stdio",
      "params": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"] }
    }
  ],
  "customTools": [
    {
      "def": {
        "type": "function",
        "function": { "name": "run_test", "description": "...", "parameters": {} }
      },
      "tags": ["dev", "test"],
      "command": ["bun", "test", "${testFile}"]
    }
  ]
}
```

**配置说明**：

| 配置项 | 说明 |
|--------|------|
| `general.theme` | 终端主题 |
| `session.autoName.enabled` | 是否自动用 LLM 生成 session 名称 |
| `session.autoName.model` | 命名用的模型（建议用便宜模型如 `openai/gpt-4o-mini`） |
| `compaction.enabled` | 是否启用自动摘要 |
| `compaction.triggerRatio` | `estimatedTokens / model.contextWindow >= 0.8` 时触发 |
| `compaction.keepRecentRatio` | 保留最近 `0.3 × model.contextWindow` 原文 |
| `mcpServers` | MCP 服务器配置，保持现有格式 |
| `customTools[].tags` | **替代 group**：一个工具可有多个标签（数组），用于分类发现 |

**关键设计**：
- **没有模型配置** — 模型由 Pi 的环境变量自动发现 + 用户在会话创建时交互选择
- **没有 temperature** — 改为 Thinking Level
- **compaction 不使用绝对 token 值** — 使用模型自带的 `model.contextWindow` 乘以比例。Pi 的每个 Model 对象都包含 `contextWindow` 字段（如 gpt-4o = 128000, claude-sonnet = 200000），运行时动态取。
- **模型表示格式**：`provider/modelId`（如 `openai/gpt-4o`、`anthropic/claude-sonnet-4-20250514`），与 Pi 的 `Model.id` 一致

## Phase 6: 功能迁移清单

### 保留功能 & 实现方式

| 功能 | 新实现 |
|------|--------|
| 多会话 | `SessionManager` 管理多个 `Session` |
| 模型选择 | 创建会话时交互选择 `provider/modelId`（从 Pi Models 环境变量发现） |
| 话题切换 | Session tree 的 leaf 切换 + branch summary |
| 会话自动命名 | `session.autoName` + 首条消息 LLM 总结 |
| 流式输出 | Pi Agent 事件 `text_delta` → `PiDisplayHandler` |
| thinking 展示 | Pi Agent 事件 `thinking_delta` → `PiDisplayHandler` |
| 工具调用 | Pi Agent 事件 `toolcall_start/end` → tool loop → 结果回传 |
| MCP 工具 | `MCPClient` 保留，输出适配 `AgentTool<any>` |
| 自定义工具 | Custom tools 适配 `AgentTool<any>` |
| 预设消息 | 初始化 `AgentContext.messages` 注入 |
| 系统提示词 | `AgentConfig.systemPrompt` |
| **Thinking Level** | `thinkingLevel`: `off` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max` |
| **Compaction** | `triggerRatio` × `model.contextWindow` 判定触发（比例配置，非绝对值） |
| 配置管理 | 精简的 ifcli 功能 JSON（无模型配置，无温度配置） |
| 历史查看 | `session.getBranch(leafId)` 遍历 + Pi 事件回放 |
| **导出** | **HTML 格式**（参考 Pi session export），替代 xlsx |
| 提示词库 | 独立 prompt 存储 |
| **主题/颜色** | 围绕 Pi 事件类型重新设计色板（见 Phase 7） |

### 不再需要的概念

| 移除 | 原因 |
|------|------|
| `contextLimit` 数字配置 | Compaction 用 `model.contextWindow × ratio` 自动管理 |
| `withContext` 开关 | 改为 `compaction.enabled` |
| `pocketflow` 依赖 | Pi Agent loop 替代 |
| `messageReducer` | Pi `streamSimple` 内部处理 |
| `topic-generator` 独立文件 | Session `autoName` 内建 |
| `temperature` 常量 + scenario 选择 | Thinking Level 替代 |
| `LLMSetting[]` 配置文件 | 环境变量 + Pi Models 自动发现 |
| `Model.llmType` 单 provider 字符串 | `provider/modelId` 格式，区分供应商 |
| xlsx 导出 | HTML 导出 |

## Phase 7: 主题/颜色重新设计

### 围绕 Pi Agent 事件设计色板

当前颜色语义是基于模糊的 "waiting/analyzing/thinking/rendering" 状态。新设计直接对应 Pi 的流式事件：

| Pi 事件 | 显示内容 | 颜色 | 说明 |
|---------|---------|------|------|
| `text_start` | — | — | 无视觉变化 |
| `text_delta` | 助手回复正文 | `assistant` 色（主题主色） | 当前 `rendering` |
| `thinking_start` | — | — | 折叠标记 |
| `thinking_delta` | 思考内容 | `thinking` 色（半透明/暗色） | 当前 `reasoning` |
| `thinking_end` | 思考完成标记 | `thinking` 色 | 可选显示 thinking 摘要 |
| `toolcall_start` | 工具名称 | `tool` 色（亮色标记） | 当前 `toolCalling` |
| `toolcall_delta` | 工具参数流 | `tool` 色暗化 | 流式显示参数 |
| `toolcall_end` | 工具调用完成 | `tool` 色 + ✓/✗ | 显示调用结果 |
| `done` | 完成状态 | `done` 色（绿色系） | token 用量显示 |
| `error` | 错误信息 | `error` 色（红色系） | 错误提示 |

### 主题色板定义

```ts
type PiThemeColors = {
  assistant: Color      // 助手回复文字颜色
  thinking: Color       // thinking 文字颜色（通常暗色/灰色）
  tool: Color           // 工具名称和结果颜色
  toolArgs: Color       // 工具参数颜色
  done: Color           // 完成状态/用量信息
  error: Color          // 错误
  user: Color           // 用户输入回显
  system: Color         // 系统消息/compaction 标记
  compaction: Color     // compaction 提示颜色
  branchSummary: Color  // 分支总结颜色
}
```

保留现有主题系统（Tokyo Night / Catppuccin 等），但调整语义映射以匹配 Pi 事件流。

---

## 实施步骤

- [ ] 1. 添加 `@earendil-works/pi-ai` `@earendil-works/pi-agent-core` 依赖
- [ ] 2. 配置重设计：删除 `LLMSetting[]` + temperature 常量，改为 Pi 环境变量发现 + 精简功能 JSON（compaction 比例、session autoName、theme）
- [ ] 3. 重写存储层：实现 `SqliteSessionStorage`（Pi SessionStorage 接口，树形 schema），含旧数据迁移
- [ ] 4. 重写 `SessionManager`：多 session CRUD、leaf 切换、autoName、HTML 导出
- [ ] 5. 重写 `AgentRunner`：Pi Agent 封装 + transformContext hook（compaction 比例触发）
- [ ] 6. 重写 `ToolRegistry`：MCP + Custom → `AgentTool<any>`
- [ ] 7. 重写 `PiDisplayHandler`：围绕 Pi SSE 事件重新设计颜色状态机 + 终端输出
- [ ] 8. Thinking Level 交互（`ist cf -s`：off/minimal/low/medium/high/xhigh/max）
- [ ] 9. 模型选择交互（创建会话时列出 `provider/modelId`，从 Pi Models 环境变量发现）
- [ ] 10. 适配 CLI 命令层（chat-command.ts, setting-command.ts）
- [ ] 11. 删除旧代码（open-ai-*.ts, ask-flow.ts, pocketflow, openai dep, temperature 常量, db-client, table-def, store, tool.ts）
- [ ] 12. 更新测试 + 端到端验证

---

## 验证

1. `bun run build` — 编译通过
2. 基础聊天：`ict "hello"` → Pi 事件驱动的流式输出，thinking 折叠显示
3. Thinking Level：`ist cf -s` → 选择 minimal/low/medium/high/xhigh/max
4. 工具调用：MCP + 自定义工具正常执行
5. 长对话 compaction：超过 20 轮后自动触发，摘要注入，回复连贯
6. 话题切换：切换后返回，branch summary 可见
7. 多会话：会话间隔离，自动命名
8. 历史查看：`ict hs` 显示 compaction 和 branch summary 标记
9. 导出：HTML 格式导出，包含完整会话样式
10. 配置：仅需设置环境变量 + 少量功能配置即可启动
