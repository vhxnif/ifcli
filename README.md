# ifcli

Chat with AI via Command Line Interface.

**Features:**

-   System prompt configuration and management
-   Preset message support
-   Chat history management and viewing
-   MCP (Model Context Protocol) tools support
-   Flexible usage patterns with `alias` commands

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

Setting management

Options:
  -V, --version        output the version number
  -h, --help           display help for command

Commands:
  config|cf [options]  configuration management
  mcp [options]        MCP server management
  prompt|pt [options]  system prompt management
  help [command]       display help for command
```

### Chat Commands

```bash
Usage: ifchat|ict [options] [command] [string]

Chat with AI

Options:
  -V, --version                output the version number
  -f, --force <name>           use specified chat session
  -s, --sync-call              synchronous call (non-streaming)
  -e, --edit                   use editor for input
  -t, --new-topic              start new topic
  -r, --retry                  retry last question
  -h, --help                   display help for command

Commands:
  new <string>                 create new chat
  history|hs [options]         view chat history
  remove|rm                    remove chat session
  switch|st [options] [name]   switch to another chat or topic
  prompt|pt [options]          prompt manager
  preset|ps [options]          preset message manager
  config|cf [options]          manage chat configuration
  export|exp [options] [path]  export chat messages
```

## Application Settings

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
            "name": "weather",
            "version": "v2",
            "enable": true,
            "type": "streamable",
            "url": "http://localhost:3000/mcp"
        },
        {
            "name": "weather",
            "version": "v3",
            "enable": true,
            "type": "stdio",
            "params": {
                "command": "bun",
                "args": [
                    "run",
                    "/Users/chen/workspace/weather-mcp/src/mcp/stdio-server.ts"
                ]
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

### MCP Server (Streamable)

| Field   | Type                                 | Required |
| :------ | :----------------------------------- | :------- |
| name    | string                               | true     |
| version | string                               | true     |
| enable  | boolean                              | true     |
| type    | 'streamable'                         | true     |
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

| Field   | Type                  | Required |
| :------ | :-------------------- | :------- |
| name    | string                | true     |
| version | string                | true     |
| enable  | boolean               | true     |
| type    | 'stdio'               | true     |
| params  | StdioServerParameters | true     |

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
