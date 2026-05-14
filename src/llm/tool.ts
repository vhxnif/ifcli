import { $ } from 'bun'
import type {
    ChatCompletionFunctionTool,
    ChatCompletionTool,
} from 'openai/resources'

type CustomTool = {
    def: ChatCompletionTool
    group: string
    command: string[]
}

type ToolDef = {
    def: ChatCompletionTool
    group: string
    call: (args: any) => Promise<any>
}

function toolsGroup(tools: ToolDef[]) {
    const groups = [...new Set(tools.map((it) => it.group))]
    return [
        {
            def: {
                type: 'function',
                function: {
                    name: 'list_available_tool_groups',
                    description:
                        'List all available tool categories (groups). Call this FIRST to discover what capabilities exist before exploring individual tools. Each group represents a distinct set of related tools.',
                    parameters: {
                        type: 'object',
                        properties: {},
                    },
                },
            },
            group: 'base',
            call: async (_: any) => {
                return groups
            },
        },
        {
            def: {
                type: 'function',
                function: {
                    name: 'list_available_tools',
                    description:
                        'List all tools and their full definitions within a specific group. Call this AFTER list_available_tool_groups to inspect the tools in a chosen category before invoking one.',
                    parameters: {
                        type: 'object',
                        properties: {
                            group_name: {
                                type: 'string',
                                enum: groups,
                                description:
                                    'The name of the tool group to inspect (obtained from list_available_tool_groups)',
                            },
                        },
                        required: ['group_name'],
                    },
                },
            },
            group: 'base',
            call: async (args: any) => {
                return tools
                    .filter((it) => it.group === args.group_name)
                    .map((it) => it.def)
            },
        },
        {
            def: {
                type: 'function',
                function: {
                    name: 'call_group_tool',
                    description:
                        'Execute a specific tool from a given group. Use this AFTER identifying the tool via list_available_tools to actually invoke it with the required arguments.',
                    parameters: {
                        type: 'object',
                        properties: {
                            group_name: {
                                type: 'string',
                                description:
                                    'The name of the group containing the tool to call',
                                enum: groups,
                            },
                            tool_name: {
                                type: 'string',
                                description:
                                    'The name of the tool to invoke (as listed by list_available_tools)',
                            },
                            args: {
                                type: 'object',
                                description:
                                    'The arguments to pass to the tool, matching the input schema defined by the tool',
                            },
                        },
                        required: ['group_name', 'tool_name'],
                    },
                },
            },
            group: 'base',
            call: async (args: any) => {
                const result = await tools
                    .find(
                        (it) =>
                            it.group === args.group_name &&
                            (it.def as ChatCompletionFunctionTool).function
                                .name === args.tool_name,
                    )
                    ?.call(args.args)
                return (
                    result ??
                    `tool ${args.tool_name} not found or returned no result`
                )
            },
        },
    ] as ToolDef[]
}

function toolsParse(customTools: CustomTool[]) {
    const buildCommand = (args: any, command: string[]) =>
        command
            .map((it) => {
                if (it.startsWith('$')) {
                    return args[it.replace('$', '')]
                }
                return it
            })
            .join(' ')
    return customTools.map(({ def, group, command }) => {
        return {
            def,
            group,
            call: async (args: any) => {
                try {
                    const cmd = buildCommand(args, command)
                    return await $`${{ raw: cmd }}`.text()
                } catch (e: unknown) {
                    console.log(e)
                    throw e
                }
            },
        } as ToolDef
    })
}

export { type CustomTool, type ToolDef, toolsGroup, toolsParse }
