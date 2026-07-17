# src/store/

> L2 | 父级: /AGENTS.md

存储层——SQLite 实现的 Pi SessionStorage 树形接口，多 session 生命周期管理。替代旧 db-client.ts + table-def.ts + store.ts + store-types.ts。

## 成员清单

- **session-storage.ts**: SQLite 实现 Pi `SessionStorage` 接口。树形 schema（session + session_entry + session_leaf），支持 appendEntry/getPathToRoot/findEntries/getMetadata 等操作。session_entry 通过 parent_id 形成 DAG，session_leaf 跟踪当前分支端点。
- **session-manager.ts**: 多 session 管理。提供 create/list/get/delete/autoName 等 CRUD 操作，SessionHandle 封装 storage + buildContext + appendMessage + updateMeta + switchLeaf。autoName 依赖外部注入的 LLM 调用。
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
