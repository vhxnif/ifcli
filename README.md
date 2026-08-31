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

Models and providers are discovered automatically by [Pi](https://github.com/earendil-works/pi) via environment variables. Configure application settings (theme, MCP servers, custom tools, compaction) using `ist cf -m` or by editing `settings.json` directly.

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
  tools [options]      manage custom tools configuration
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
  -c, --clean                  run without context message 
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
    "$schema": "./settings-schema.json",
    "generalSetting": {
        "theme": "Tokyo Night"
    },
    "session": {
        "autoName": {
            "enabled": true,
            "model": "openai/gpt-4o-mini"
        }
    },
    "compaction": {
        "enabled": true,
        "triggerRatio": 0.8,
        "keepRecentRatio": 0.3
    },
    "mcpServers": [
        {
            "name": "weather",
            "version": "v1",
            "enable": true,
            "type": "sse",
            "url": "http://localhost:3000/sse"
        }
    ],
    "customTools": []
}
```

### Model Providers

Providers and models are discovered automatically by Pi via environment variables. Common variables:

| Provider   | Environment Variables                              |
| :--------- | :------------------------------------------------- |
| DeepSeek   | `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`            |
| OpenAI     | `OPENAI_API_KEY`, `OPENAI_BASE_URL`                |
| Anthropic  | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`          |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`        |

Select a per-session model with:

```bash
ict cf -m
```

### General Settings

| Field | Type   | Required |
| :---- | :----- | :------- |
| theme | string | true     |

### Session Settings

| Field            | Type    | Required |
| :--------------- | :------ | :------- |
| autoName.enabled | boolean | true     |
| autoName.model   | string  | true     |

### Compaction Settings

| Field           | Type    | Required |
| :-------------- | :------ | :------- |
| enabled         | boolean | true     |
| triggerRatio    | number  | true     |
| keepRecentRatio | number  | true     |

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

Custom tools allow you to define CLI commands as callable AI tools. They are configured in `settings.json` under the `customTools` array, alongside the rest of the application configuration.

### Tool Definition Format

```json
{
    "$schema": "./settings-schema.json",
    "generalSetting": { "theme": "Tokyo Night" },
    "session": { "autoName": { "enabled": true, "model": "openai/gpt-4o-mini" } },
    "compaction": { "enabled": true, "triggerRatio": 0.8, "keepRecentRatio": 0.3 },
    "mcpServers": [],
    "customTools": [
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
            "tags": ["weather"],
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
            "tags": ["math"],
            "command": ["bash", "-c", "echo $((${expr}))"]
        }
    ]
}
```

| Field   | Type     | Required | Description |
| :------ | :------- | :------- | :---------- |
| def     | object   | true     | OpenAI function tool definition (name, description, parameters) |
| tags    | string[] | true     | Tool categories for organization and selection (replaces old `group`) |
| command | string[] | true     | CLI command array; use `${paramName}` for argument interpolation |

### Usage

```bash
# Edit settings (including custom tools) with schema validation in IDE
ist cf -m

# List configured custom tools
ist tools -l
```

The AI model first discovers available tool groups, then inspects individual tools, and finally invokes them — a three-step discovery process managed automatically by the built-in `list_available_tool_groups` and `list_available_tools` functions.

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
