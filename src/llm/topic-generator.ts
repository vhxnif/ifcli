import type OpenAI from 'openai'

export const TEMP_TOPIC_PREFIX = '[TEMP-TOPIC-'

export function isTempTopicName(topicName: string): boolean {
    return topicName.startsWith(TEMP_TOPIC_PREFIX)
}

export function generateTempTopicName(): string {
    return `${TEMP_TOPIC_PREFIX}${Date.now()}]`
}

export async function generateTopicName(
    userContent: string,
    client: OpenAI,
    model: string,
    callback: (s: string) => void,
): Promise<string> {
    const truncatedContent = userContent.slice(0, 500)

    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        'Generate a brief topic title (max 50 chars) in the same language as the user input. Be concise and descriptive. Only return the title, nothing else.',
                },
                {
                    role: 'user',
                    content: `Summarize this into a topic: ${truncatedContent}`,
                },
            ],
            temperature: 0.3,
        })
        const topic = response.choices[0]?.message.content?.trim()
        if (topic && topic.length > 0) {
            const t = topic
                .replace(/["\n\r]/g, ' ')
                .trim()
                .slice(0, 50)
            callback(t)
        }
    } catch {
        // Failed to generate topic name
    }

    return ''
}
