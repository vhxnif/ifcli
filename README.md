# ifcli

Chat with AI via Command Line Interface.

**Features:**

-   System prompt configuration and management
-   Preset message support
-   Chat history management and viewing
-   MCP (Model Context Protocol) tools support
-   Custom tools — define CLI commands as callable AI tools
-   Flexible usage patterns with `alias` commands
-   Environment variable support for secure configuration (backward compatible with direct configuration)

## Installation

`ifcli` is built using [Bun.js](https://bun.sh/) and requires a Bun environment.

### From NPM

```bash
npm install -g @vhxnif/ifcli
```

### From Source

```bash
bun install && bun run build && bun link
```

## Configuration

Configure application settings using the `ist cf -m` command. **Please configure your LLM settings before first use.**

To use MCP Servers, configure the relevant settings and enable MCP functionality for your chat session with `ict cf -p`.

The `EDITOR` environment variable must be set to enable configuration editing and system functions. If not configured, `vim` is used as the default editor.

### Data Directory

**Windows:** Data and MCP configurations are stored in `%APPDATA%\ifcli`

**macOS/Linux:** Data is located in `$HOME/.config/ifcli`

Each release includes a version-specific SQLite database file (`ifcli_<version>.sqlite`). Data migration between versions must be handled manually.

## Commands

### Setting Commands

```bash
Usage: ifsetting|ist [options] [command]

Manage application settings and configuration

Options:
  -V, --version        output the version number
  -h, --help           display help for command

Commands:
  config|cf [options]  manage application configuration
  mcp [options]        manage MCP (Model Context Protocol) servers
  prompt|pt [options]  manage system prompts library
  help [command]       display help for command
```

### Chat Commands

```bash
Usage: ifchat|ict [options] [command] [string...]

Interactive AI chat interface

Arguments:
  string                       chat message content (multiple arguments will be joined into a single string)

Options:
  -V, --version                output the version number
  -f, --force <name>           use specified chat session
  -s, --sync-call              use synchronous (non-streaming) mode
  -e, --edit                   open editor for input
  -t, --new-topic              start a new conversation topic
  -r, --retry                  retry the last question
  -a, --attachment <file>      attach text file content to message
  -h, --help                   display help for command

  Commands:
    new <string>                 create a new chat session
    history|hs [options]         view chat conversation history
    remove|rm                    delete a chat session
    switch|st [options] [name]   switch between chat sessions or topics
    prompt|pt [options]          manage system prompts
    preset|ps [options]          manage preset message templates
    config|cf [options]          configure chat settings
      -t, --tools                enable/disable custom tools
    export|exp [options] [path]  export chat conversations
```

## Application Settings

### Example

```json
{
    "generalSetting": {
        "theme": "ethereal_glow"
    },
    "mcpServers": [
        {
            "name": "weather",
            "version": "v1",
            "enable": true,
            "type": "sse",
            "url": "http://localhost:3000/sse"
        },
        {
            "name": "sequential-thingking",
            "version": "v1",
            "enable": true,
            "type": "stdio",
            "params": {
                "command": "npx",
                "args": [
                    "-y",
                    "@modelcontextprotocol/server-sequential-thinking"
                ]
            }
        },
        {
            "name": "context7",
            "version": "v1",
            "enable": true,
            "type": "http",
            "url": "https://mcp.context7.com/mcp",
            "headers": {
                "CONTEXT7_API_KEY": "<your api key>"
            }
        }
    ],
    "llmSettings": [
        {
            "name": "deepseek",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": "<your deepseek api key>",
            "models": ["deepseek-chat", "deepseek-reasoner"]
        },
        {
            "name": "ollama",
            "baseUrl": "http://localhost:11434/v1/",
            "apiKey": "",
            "models": ["gemma3:latest"]
        },
        {
            "name": "openai",
            "baseUrl": "https://api.openai.com/v1",
            "apiKey": "<your openai key>",
            "models": ["gpt-4o"]
        },
        {
            "name": "openrouter",
            "baseUrl": "https://openrouter.ai/api/v1",
            "apiKey": "<your openrouter key>",
            "models": [
                "deepseek/deepseek-chat-v3-0324:free",
                "deepseek/deepseek-r1-0528:free",
                "deepseek/deepseek-r1:free",
                "qwen/qwen3-coder:free"
            ]
        }
    ]
}
```

Application settings support both direct configuration and environment variable placeholders using the `$env.` prefix.
This allows you to securely store sensitive information like API keys in environment variables while maintaining backward compatibility.

#### Usage Example

```json
{
    "name": "deepseek",
    "baseUrl": "$env.DEEPSEEK_BASE_URL",
    "apiKey": "$env.DEEPSEEK_API_KEY",
    "models": ["deepseek-chat", "deepseek-reasoner"]
}
```

### General Settings

| Field | Type   | Required |
| :---- | :----- | :------- |
| theme | string | true     |

### LLM Settings

| Field   | Type     | Required |
| :------ | :------- | :------- |
| name    | string   | true     |
| baseUrl | string   | true     |
| apiKey  | string   | false    |
| models  | string[] | true     |

### MCP Server (http)

| Field   | Type                                 | Required |
| :------ | :----------------------------------- | :------- |
| name    | string                               | true     |
| version | string                               | true     |
| enable  | boolean                              | true     |
| type    | 'http'                               | true     |
| url     | string                               | true     |
| opts    | StreamableHTTPClientTransportOptions | false    |

### MCP Server (SSE)

| Field   | Type                      | Required |
| :------ | :------------------------ | :------- |
| name    | string                    | true     |
| version | string                    | true     |
| enable  | boolean                   | true     |
| type    | 'sse'                     | true     |
| url     | string                    | true     |
| opts    | SSEClientTransportOptions | false    |

### MCP Server (Stdio)

| Field   | Type                  | Required | Description |
| :------ | :-------------------- | :------- | :---------- |
| name    | string                | true     | Server name |
| version | string                | true     | Server version |
| enable  | boolean               | true     | Enable/disable server |
| type    | 'stdio'               | true     | Transport type |
| params  | StdioServerParameters | true     | Server parameters |
| logMode | 'ignore' \| 'inherit' \| 'file' | false    | Log output mode (default: captured silently) |

**Log Mode Options:**
- (default): Capture stderr silently, preventing log mixing with CLI output
- `ignore`: Discard all stderr output from MCP server
- `inherit`: Pass stderr output to parent process (may mix with CLI output)

## Custom Tools

Custom tools allow you to define CLI commands as callable AI tools. Tools are defined in `ifcli-custom-tools.json` in the data directory and can be selected per chat session.

### Tool Definition Format

```json
[
    {
        "def": {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather for a city",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "City name"
                        }
                    },
                    "required": ["city"]
                }
            }
        },
        "group": "weather",
        "command": ["curl", "wttr.in/${city}?format=3"]
    },
    {
        "def": {
            "type": "function",
            "function": {
                "name": "calc",
                "description": "Evaluate a mathematical expression",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expr": {
                            "type": "string",
                            "description": "Math expression to evaluate"
                        }
                    },
                    "required": ["expr"]
                }
            }
        },
        "group": "math",
        "command": ["bash", "-c", "echo $((${expr}))"]
    }
]
```

| Field   | Type     | Required | Description |
| :------ | :------- | :------- | :---------- |
| def     | object   | true     | OpenAI function tool definition (name, description, parameters) |
| group   | string   | true     | Tool category group for organization and selection |
| command | string[] | true     | CLI command array; use `${paramName}` for argument interpolation |

### Usage

```bash
# Select custom tools for the current chat session
ict cf -t

# Enable all or specific custom tools for a chat
# Use the checkbox UI to select which tools to enable
```

The AI model first discovers available tool groups, then inspects individual tools, and finally invokes them — a three-step discovery process managed automatically by the built-in `list_available_tool_groups`, `list_available_tools`, and `call_group_tool` functions.

## Usage Tips

### Chat Session Management

```bash
# Use specific chat sessions without switching context
# 'ts' is a chat session for translation purposes
alias ts='ict -f ts'
```

### Disable Streaming Output

```bash
# Use synchronous output for pipeline operations
ict -sf ts

# Create custom commands for pipelines
alias sts='ict -sf ts'
cat system_prompt.md | sts | tee system_prompt.txt
```

### Edit System Prompts

Using pipes:

```bash
cat system_prompt.md | ict pt -c
```

Using editor:

```bash
ict pt -m
```

### Retry Last Question

If a response fails for any reason, use the `-r` or `--retry` flag to retry the most recent question without losing context:

```bash
ict -r
```
