import type { Context } from '@earendil-works/pi-ai'
import { builtinModels } from '@earendil-works/pi-ai/providers/all'

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
