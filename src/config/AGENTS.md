# src/config/

> L2 | 父级: /AGENTS.md

配置层——功能配置的类型定义、JSON Schema、读写、校验。模型供应商由 Pi 环境变量自动发现，不在此层管理。

## 成员清单

- **app-setting.ts**: 功能配置类型（GeneralSetting/SessionConfig/CompactionConfig/CustomToolDef）与 JSON 文件读写。`customTools` 的 group 已改为 tags（数组）。替代旧 LLMSetting[] + temperature 常量。
- **data-config.ts**: 平台相关的数据路径解析（~/.config/ifcli/ 或 %APPDATA%/ifcli/）。
- **setting-validator.ts**: JSON Schema 校验。精简后不再校验 LLMSetting。
- **prompt-message.ts**: 用户可见的提示文案常量。
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
