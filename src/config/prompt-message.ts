export const promptMessage = {
    chatMissing:
        'No chat found. Please create a new chat using: `ict new <chatName>`',
    chatConfigMissing:
        'Chat configuration is missing. Please configure the chat settings.',
    configExtMissing: 'Chat extension configuration is missing.',
    onlyOneChat: 'Only one chat is available.',
    settingMissing:
        'LLM settings not configured. Please run: `ist cf -m` to configure providers and models.',
    providerMissing:
        'No AI providers selected. Please configure at least one provider.',
    modelMissing: 'No models selected. Please configure at least one model.',
    systemPromptNoMatching:
        'No matching system prompt found for the current configuration.',
    systemPromptMissing:
        'System prompt is not configured. Please set up a system prompt.',
    assistantMissing: 'Assistant response content is missing.',
    hisMsgMissing: 'No message history available for this chat.',
    oneChatRemain:
        'Cannot delete the last remaining chat. At least one chat must be kept.',
    noEdit: 'No changes were made.',
    presetMsgMissing: 'No preset messages are configured.',
    cfParseErr:
        'Error parsing configuration file. Please check the configuration format.',
    mcpMissing:
        'No MCP servers are configured or enabled. Please configure MCP servers first.',
    userPreset: '<user message content>',
    assistantPreset: '<assistant message content>',
    onlyOneTopic: 'Only one topic is available.',
    topicMissing: 'No topics are available for this chat.',
    topicIdMissing: 'No topic is currently selected.',
    retryOptionsMisssing: 'No recent question available for retry.',
    mcpConfigError: 'MCPServer config error. name: ',
}
