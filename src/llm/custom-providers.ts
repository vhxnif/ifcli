/**
 * [INPUT]: 依赖 ../config/app-setting 的 CustomProviderApi/CustomProviderDef，
 *          依赖 ./base 的 createProvider/envApiKeyAuth 与各协议实现工厂
 * [OUTPUT]: registerCustomProviders 函数 —— 把 settings.providers 注册进 Pi Models，返回已注册/跳过/告警清单
 * [POS]: src/llm/ 的自定义 provider 注册器，被 app-context 在内置模型装配后、getAvailable 之前调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type {
    CustomProviderApi,
    CustomProviderDef,
} from '../config/app-setting'
import {
    anthropicMessagesApi,
    azureOpenAIResponsesApi,
    bedrockConverseStreamApi,
    createProvider,
    envApiKeyAuth,
    googleGenerativeAIApi,
    googleVertexApi,
    type MutableModels,
    mistralConversationsApi,
    openAICodexResponsesApi,
    openAICompletionsApi,
    openAIResponsesApi,
    type ProviderStreams,
    piMessagesApi,
} from './base'

// ── api 字符串 → pi-ai 协议实现工厂 ──

const apiFactories: Record<CustomProviderApi, () => ProviderStreams> = {
    'anthropic-messages': anthropicMessagesApi,
    'azure-openai-responses': azureOpenAIResponsesApi,
    'bedrock-converse-stream': bedrockConverseStreamApi,
    'google-generative-ai': googleGenerativeAIApi,
    'google-vertex': googleVertexApi,
    'mistral-conversations': mistralConversationsApi,
    'openai-codex-responses': openAICodexResponsesApi,
    'openai-completions': openAICompletionsApi,
    'openai-responses': openAIResponsesApi,
    'pi-messages': piMessagesApi,
}

// ── 类型 ──

export interface CustomProviderRegistration {
    registered: string[]
    skipped: { id: string; reason: string }[]
    warnings: { id: string; reason: string }[]
}

// ── 注册 ──

/** 把自定义 provider 注册进 Pi Models 实例；单个 provider 失败不影响其余 */
export function registerCustomProviders(
    models: MutableModels,
    defs: CustomProviderDef[],
): CustomProviderRegistration {
    const registered: string[] = []
    const skipped: { id: string; reason: string }[] = []
    const warnings: { id: string; reason: string }[] = []

    for (const def of defs) {
        const factory = apiFactories[def.api]
        if (!factory) {
            skipped.push({ id: def.id, reason: `unknown api: ${def.api}` })
            continue
        }
        if (def.apiKeyEnv.length === 0) {
            skipped.push({ id: def.id, reason: 'apiKeyEnv is empty' })
            continue
        }
        if (models.getProvider(def.id)) {
            warnings.push({
                id: def.id,
                reason: 'overrides an existing provider with the same id',
            })
        }

        models.setProvider(
            createProvider({
                id: def.id,
                name: def.name ?? def.id,
                baseUrl: def.baseUrl,
                headers: def.headers,
                auth: {
                    apiKey: envApiKeyAuth(def.name ?? def.id, def.apiKeyEnv),
                },
                models: def.models.map((m) => ({
                    id: m.id,
                    name: m.name ?? m.id,
                    api: def.api,
                    provider: def.id,
                    baseUrl: def.baseUrl,
                    reasoning: m.reasoning ?? false,
                    thinkingLevelMap: m.thinkingLevelMap,
                    compat: m.compat,
                    input: m.input ?? (['text'] as ('text' | 'image')[]),
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: m.contextWindow ?? 128_000,
                    maxTokens: m.maxTokens ?? 8_192,
                })),
                api: factory(),
            }),
        )
        registered.push(def.id)
    }

    return { registered, skipped, warnings }
}
