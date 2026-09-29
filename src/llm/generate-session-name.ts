/**
 * [INPUT]: 依赖 ./base 集中提供的 builtinModels 与 Context，使用指定模型压缩首轮用户意图
 * [OUTPUT]: generate 会话短名称生成函数
 * [POS]: src/llm/ 的轻量模型调用，被 ChatService 自动命名流程消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { Context } from './base'
import { builtinModels } from './base'

export async function generate(content: string, provider: string, id: string) {
    // A Models collection with every built-in provider registered
    const models = builtinModels()
    // Sync lookup against the collection
    const model = models.getModel(provider, id)!
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
    models.complete(model, context)
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
