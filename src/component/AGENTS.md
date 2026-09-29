# src/component/

> L2 | 父级: /AGENTS.md

终端展示层——把聊天历史、Agent 配置和运行状态映射为稳定的终端文本与色彩，不承担会话状态或模型调用。

## 成员清单

- **agent-history-show.ts**: Agent 历史消息渲染器，覆盖 Pi system/user/assistant/toolResult 消息并关联工具调用与结果。
- **chat-history.ts**: 紧凑聊天历史渲染器，与 Agent 历史视图共享消息语义但保留单行用户内容布局。
- **ora-show.ts**: Ora spinner 生命周期封装，以主题色和 unicode-animations 帧统一运行状态反馈。
- **properties-show.ts**: Agent 与应用配置的只读属性格式化器，负责长系统提示词折叠展示。
- **theme/**: 主题色板模块，集中定义颜色契约、Chalk 映射与内置主题集合。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
