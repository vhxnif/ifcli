# ifcli

Chat with AI via Command Line Interface.

**Features:**

-   Agent / session two-level conversation management (agent = chat, session = topic)
-   Automatic session name generation
-   Per-agent system prompts, models, tools and skills
-   Reasoning level control (`off` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max`)
-   MCP (Model Context Protocol) tools support (HTTP / SSE / Stdio)
-   Custom tools — define CLI commands as callable AI tools
-   Skill extension — drop a `SKILL.md` into the skills directory and enable per agent
-   Context compaction for long conversations
-   Searchable model selection
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

Models and providers are discovered automatically by [Pi](https://github.com/earendil-works/pi) via environment variables. Configure application settings (theme, MCP servers, custom tools, compaction) using `ist cf -m` or by editing `settings.json` directly.

The `EDITOR` environment variable must be set to enable configuration editing and system functions. If not configured, `vim` is used as the default editor.

### Data Directory

**Windows:** Data and MCP configurations are stored in `%APPDATA%\ifcli`

**macOS/Linux:** Data is located in `$HOME/.config/ifcli`

Sessions and agents are stored in `data.sqlite` inside the data directory.

## Quick Start

```bash
# Create an agent (chat) with a model
ict new translator -m openai/gpt-4o-mini

# Chat with it (or without -f to use the current agent)
ict -f translator "translate this sentence"

# Switch the model / system prompt / tools / skills of an agent
ict cf -m
ict cf -s
ict cf -t
ict cf -k
```

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
  mcp [options]        manage MCP servers
  tools|ts [options]   manage custom tools
  help [command]       display help for command
```

`ist cf` sub-options:

```bash
Usage: ifsetting config|cf [options]

Options:
  -m, --modify                  edit application settings JSON
  -t, --theme                   change color theme
  -s, --thinking-level <level>  validate a thinking level; set it per agent with `ict cf -r`
```

### Chat Commands

```bash
Usage: ifchat|ict [options] [command] [string...]

Interactive AI chat interface (powered by Pi)

Arguments:
  string                    chat message content (multiple arguments will be joined)

Options:
  -V, --version             output the version number
  -f, --force <id-or-name>  use specified agent by id or name
  -s, --sync-call           use synchronous (non-streaming) mode
  -e, --edit                open editor for input
  -t, --new-session         create a new session under current agent for this message
  -a, --attachment <file>   attach text file content to message
  -c, --clean               run without context message
  -h, --help                display help for command

Commands:
  new [options] <name>      create a new agent (chat)
  remove|rm                 delete an agent (chat) and all its sessions
  switch|st                 switch between agents (chats)
  config|cf [options]       configure current agent (chat) settings
  history|hs [options]      view current session (topic) conversation history
  session|ss                manage sessions (topics) under current agent
```

`ict cf` sub-options:

```bash
Usage: ifchat config|cf [options]

Options:
  -m, --model                   switch AI model
  -r, --reasoning <level>       set reasoning level
                                (off/minimal/low/medium/high/xhigh/max)
  -t, --tools                   enable/disable tools for this agent
  -s, --system-prompt [prompt]  set or edit system prompt
  -k, --skills                  enable/disable skills for this agent
```

`ict session` sub-commands:

```bash
Usage: ifchat session|ss [options] [command]

Commands:
  new <name>      create a new session under current agent
  switch|sw       switch session under current agent
  remove|rm       remove a session under current agent
```

## Application Settings

### Example

```json
{
    "$schema": "./settings-schema.json",
    "generalSetting": {
        "theme": "Tokyo Night",
        "toolDiscoveryThreshold": 8
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

Select a per-agent model with:

```bash
ict cf -m
```

### General Settings

| Field                   | Type   | Required | Description |
| :---------------------- | :----- | :------- | :---------- |
| theme                   | string | true     | Color theme (see below) |
| toolDiscoveryThreshold | number | false    | When the number of enabled tools for a session exceeds this threshold, only the two discovery tools (`list_available_tool_groups` / `list_available_tools`) are injected; otherwise all tool schemas are injected directly (default: 8) |

Available themes (via `ist cf -t`):

`Tokyo Night` · `Tokyo Night Day` · `Tokyo Night Moon` · `Tokyo Night Storm` · `Rose Pine` · `Rose Pine Moon` · `Rose Pine Dawn` · `Catppuccin Latte` · `Catppuccin Frappe` · `Catppuccin Macchiato` · `Catppuccin Mocha`

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

## Skills

Skills are Pi-style instruction packs. Drop a `SKILL.md` into `~/.config/ifcli/skills/<skill>/` (macOS/Linux) or `%APPDATA%\ifcli\skills\<skill>\` (Windows), then enable it for an agent:

```bash
ict cf -k
```

Enabled skills are exposed to the model via the built-in `Skill` tool.

## Usage Tips

### Agent-based Chat Management

```bash
# 'ts' is an agent for translation purposes
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

Per-agent system prompt, using the editor:

```bash
ict cf -s
```

Or pass a prompt directly:

```bash
ict cf -s "You are a helpful translator."
```

### New Session Per Message

Start a fresh topic without switching agents:

```bash
ict -t "start a new topic with this message"
```
