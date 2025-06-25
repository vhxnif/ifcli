# ifcli

Chat with AI via CLI.

**Features:**

-   System prompt settings and management.
-   Support preset message settings.
-   History chat record management and viewing.
-   MCP(tools) Supported.
-   Supports diverse gameplay with `alias`.

## Install

`ifcli` is built by [bunjs](https://bun.sh/) and requires a bun environment.

### From NPM

```bash
npm install -g @vhxnif/ifcli
```

### From Source Code

```bash
bun install && bun run build && bun link
```

## Config

To configure various application settings using the `ist cf -m` command.**Please configure the large model settings before use.**

To use MCP Server, you must first configure the relevant information and enable MCP functionality for the current chat session `ict cf -p`.

The `EDITOR` environment variable must be configured to enable configuration editing and related system functions.If not configured, `vim` will be used as the default editor.

### Data Path

**Windows:** Data and MCP configurations are stored in %APPDATA%\ifcli.

**macOS/Linux:** They are located in $HOME/.config/ifcli.

Every release includes a version-specific data file (ifcli\_\<version\>.sqlite). You will need to handle data migration separately.

## Command

`setting` command

```bash
Usage: ifsetting|ist [options] [command]

ifcli setting

Options:
  -V, --version        output the version number
  -h, --help           display help for command

Commands:
  config|cf [options]  config management
  mcp [options]        mcp server management
  prompt|pt [options]  system prompt management
  help [command]       display help for command
```

`chat` command

```bash
Usage: ifchat|ict [options] [command]

ifcli chat with LLM

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  new <string>            new chat
  ask [options] [string]  chat with AI
  history|hs [options]    view chat history
  remove|rm               remove chat
  switch|st [options]     switch to another chat or topic
  prompt|pt [options]     prompt manager
  preset|ps [options]     preset message manager
  config|cf [options]     manage chat config
  help [command]          display help for command
```

### AppSetting

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
            "type": "steamable",
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
        }
    ]
}
```

**General Setting**
| column name | type | required |
| :-----------| :-------| :--------|
| interactive | boolean | true |

**LLM Setting**
| column name | type | required |
|:------------|:---------|:---------|
| name | string | true |
| baseUrl | string | true |
| apiKey | string | false |
| models | string[] | true |

**MCP Server(Streamable)**
| column name | type | required |
|:------------|:-------------------------------------|:---------|
| name | string | true |  
| version | string | true |  
| type | 'streamable' | true |  
| url | string | true |
| opts | StreamableHTTPClientTransportOptions | false |

**MCP Server(SSE)**
| column name | type | required |
|:------------|:--------------------------|:---------|
| name | string | true |  
| version | string | true |  
| type | 'sse' | true |  
| url | string | true |
| opts | SSEClientTransportOptions | false |

**MCP Server(Stdio)**
| column name | type | required |
|:------------|:----------------------|:---------|
| name | string | true |  
| version | string | true |  
| type | 'stdio' | true |
| params | StdioServerParameters | true |

## Tips

### Chat without `ifcli switch`

```bash
# the `ts` is another chat that supports translation.
alias ts = ifcli ask -c 'ts'
```

### Close Stream Output

```bash
# sync call ifcli use `helix editor` for simple task
ifcli ask -sc 'ts'
# create your own command
alias sts = ifcli ask -sc 'ts'
cat system_prompt.md | sts | save system_prompt.txt
```

### Edit System Prompt

Pipe symbols are supported

```bash
cat system_prompt.md | ifcli pt -c
```

Use the editor

```bash
ifcli pt -m
```
