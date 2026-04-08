import schemaContent from './ifcli-settings-schema.json'

const allowedThemes: string[] = (
    schemaContent.properties!.generalSetting as {
        properties: { theme: { enum: string[] } }
    }
).properties.theme.enum

const requiredLlmFields: string[] = (
    schemaContent.properties!.llmSettings as {
        items: { required: string[] }
    }
).items.required

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

    if (!Array.isArray(obj.llmSettings)) {
        errors.push('缺少 llmSettings 或类型错误')
    } else {
        for (const [i, item] of (
            obj.llmSettings as Record<string, unknown>[]
        ).entries()) {
            for (const field of requiredLlmFields) {
                if (!(field in item)) {
                    errors.push(`llmSettings[${i}] 缺少必填字段: ${field}`)
                }
            }
            if (
                typeof item.models !== 'undefined' &&
                !Array.isArray(item.models)
            ) {
                errors.push(`llmSettings[${i}].models 必须是数组`)
            }
        }
    }

    if (!Array.isArray(obj.mcpServers)) {
        errors.push('缺少 mcpServers 或类型错误')
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

    return { valid: errors.length === 0, errors }
}

export { validateSetting }
