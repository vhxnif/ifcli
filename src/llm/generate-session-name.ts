/**
 * [INPUT]: 依赖 ./base 集中提供的 Context/Models 类型；Models 集合由调用方传入（含内置 + 自定义 provider）
 * [OUTPUT]: generate 会话短名称生成函数
 * [POS]: src/llm/ 的轻量模型调用，被 ChatService 自动命名流程消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { Context, Models } from './base'

export async function generate(
    content: string,
    provider: string,
    id: string,
    models: Models,
) {
    // Sync lookup against the caller's Models collection (built-in + custom providers)
    const model = models.getModel(provider, id)
    if (!model) {
        // 自动命名是增强功能，模型无效时抛出可被上层捕获的明确错误，而非让 undefined 流入流函数
        throw new Error(`Auto-name model unavailable: ${provider}/${id}`)
    }
    // Build a conversation context (easily serializable and transferable between models)
    const context: Context = {
        systemPrompt: `Extract the core intent from the user's question. Output a short session name in the same language (2–6 words, noun/verb phrase, goal-focused). Output only the name.`,
        messages: [
            {
                role: 'user',
                content,
                timestamp: Date.now(),
            },
        ],
    }
    const response = await models.complete(model, context)
    return response.content
        .map((it) => {
            if (it.type === 'text') {
                return it.text
            }
            return ''
        })
        .join('')
}
