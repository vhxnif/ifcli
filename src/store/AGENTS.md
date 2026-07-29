# src/store/

> L2 | 父级: /AGENTS.md

存储层——SQLite 实现的 Pi SessionStorage 树形接口，agent/session 两层生命周期管理，及 active agent 持久化。替代旧 db-client.ts + table-def.ts + store.ts + store-types-types.ts。

## 成员清单

- **schema.sql**: SQLite 数据库结构定义，集中存放 agent / session / session_entry / session_leaf / app_state 五张表及索引的 CREATE 语句。
- **session-storage.ts**: SQLite `SessionStorage` 实现。运行时用 `Bun.file` 加载 `schema.sql`，包含 appendEntry / getPathToRoot / findEntries / getMetadata 等操作；session_entry 通过 parent_id 形成 DAG，session_leaf 跟踪当前分支端点。
- **agent-manager.ts**: agent/session 两层管理入口。提供 create/list/get/delete agent、create/list/get/delete session、autoName 等 CRUD，封装 `AgentHandle`/`SessionHandle`；新增 `getActiveAgentId`/`setActiveAgentId`，通过 `app_state` 表持久化当前 active agent。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
