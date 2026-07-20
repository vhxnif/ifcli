/**
 * [INPUT]: 依赖 ./settings-schema.json 的 schema 定义
 * [OUTPUT]: validateSetting 函数（校验 Setting 对象）
 * [POS]: src/config/ 的校验器，被 setting-command 等消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import schemaContent from './settings-schema.json'

const allowedThemes: string[] = (
    schemaContent.properties!.generalSetting as {
        properties: { theme: { enum: string[] } }
    }
).properties.theme.enum

const mcpServerTypes: string[] = (
    schemaContent.properties!.mcpServers as {
        items: {
            oneOf: {
                properties: { type: { const: string } }
                required: string[]
            }[]
        }
    }
).items.oneOf.map((it) => it.properties.type.const)

const mcpRequiredByType: Record<string, string[]> = (
    schemaContent.properties!.mcpServers as {
        items: {
            oneOf: {
                properties: { type: { const: string } }
                required: string[]
            }[]
        }
    }
).items.oneOf.reduce(
    (acc, it) => {
        acc[it.properties.type.const] = it.required
        return acc
    },
    {} as Record<string, string[]>,
)

type ValidationResult = {
    valid: boolean
    errors: string[]
}

const validateSetting = (obj: Record<string, unknown>): ValidationResult => {
    const errors: string[] = []

    // generalSetting
    if (!obj.generalSetting || typeof obj.generalSetting !== 'object') {
        errors.push('缺少 generalSetting 或类型错误')
    } else {
        const gs = obj.generalSetting as Record<string, unknown>
        if (typeof gs.theme !== 'string') {
            errors.push('generalSetting.theme 必须是字符串')
        } else if (!allowedThemes.includes(gs.theme)) {
            errors.push(
                `generalSetting.theme "${gs.theme}" 无效，可选值: ${allowedThemes.join(', ')}`,
            )
        }
    }

    // session
    if (!obj.session || typeof obj.session !== 'object') {
        errors.push('缺少 session 配置')
    } else {
        const s = obj.session as Record<string, unknown>
        const an = s.autoName as Record<string, unknown> | undefined
        if (!an || typeof an !== 'object') {
            errors.push('session.autoName 配置缺失')
        } else {
            if (typeof an.enabled !== 'boolean') {
                errors.push('session.autoName.enabled 必须是 boolean')
            }
            if (typeof an.model !== 'string' || !an.model.includes('/')) {
                errors.push(
                    'session.autoName.model 必须是 provider/modelId 格式',
                )
            }
        }
    }

    // compaction
    if (!obj.compaction || typeof obj.compaction !== 'object') {
        errors.push('缺少 compaction 配置')
    } else {
        const c = obj.compaction as Record<string, unknown>
        if (typeof c.enabled !== 'boolean')
            errors.push('compaction.enabled 必须是 boolean')
        if (
            typeof c.triggerRatio !== 'number' ||
            c.triggerRatio <= 0 ||
            c.triggerRatio > 1
        )
            errors.push('compaction.triggerRatio 必须是 0~1 之间的数值')
        if (
            typeof c.keepRecentRatio !== 'number' ||
            c.keepRecentRatio <= 0 ||
            c.keepRecentRatio >= 1
        )
            errors.push(
                'compaction.keepRecentRatio 必须是 0~1 之间（不含端点）的数值',
            )
    }

    // mcpServers (optional)
    if (obj.mcpServers !== undefined) {
        if (!Array.isArray(obj.mcpServers)) {
            errors.push('mcpServers 必须是数组')
        } else {
            for (const [i, item] of (
                obj.mcpServers as Record<string, unknown>[]
            ).entries()) {
                if (
                    typeof item.type !== 'string' ||
                    !mcpServerTypes.includes(item.type)
                ) {
                    errors.push(
                        `mcpServers[${i}].type 无效，可选值: ${mcpServerTypes.join(', ')}`,
                    )
                    continue
                }
                const requiredFields = mcpRequiredByType[item.type] ?? []
                for (const field of requiredFields) {
                    if (!(field in item)) {
                        errors.push(
                            `mcpServers[${i}] 缺少必填字段: ${field} (type: ${item.type})`,
                        )
                    }
                }
            }
        }
    }

    // customTools (optional)
    if (obj.customTools !== undefined && !Array.isArray(obj.customTools)) {
        errors.push('customTools 必须是数组')
    }

    return { valid: errors.length === 0, errors }
}

export { validateSetting }
