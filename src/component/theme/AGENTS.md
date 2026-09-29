# src/component/theme/

> L2 | 父级: /src/component/AGENTS.md

终端主题子模块——以统一类型契约承载内置色板，并在唯一入口转换为 Chalk 实例供 CLI 与展示组件消费。

## 成员清单

- **catppuccin.ts**: Catppuccin Latte/Frappe/Macchiato/Mocha 色板与 spinner 配置。
- **color-scheme.ts**: 主题注册与解析入口，把静态十六进制色板转换为 Chalk 色彩，并提供 Commander help 样式。
- **rose-pine.ts**: Rosé Pine、Moon、Dawn 色板与 spinner 配置。
- **theme-type.ts**: 主题边界类型，定义终端颜色键、静态色板、Chalk 色板和 spinner 名称。
- **tokyo-night.ts**: Tokyo Night、Day、Moon、Storm 色板与 spinner 配置。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
