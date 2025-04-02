# ifcli

Chat with AI via CLI.

## Install 
```bash
# install bun
npm install -g bun
```

### From NPM
```bash
npm install -g @vhxnif/ifcli
```

### From Source Code
```bash
bun install && bun run build && bun link
```

## Config

**Windows**: Data and MCP configurations are stored in %APPDATA%\ifcli.

**macOS/Linux**: They are located in $HOME/.config/ifcli.


### Deepseek

| Key                     | Value                            | 
|:------------------------|:---------------------------------|
| IFCLI_DEEPSEEK_API_KEY  | \<your_deepseek_api_key\>        |
| IFCLI_DEEPSEEK_BASE_URL | https://api.deepseek.com         |
| IFCLI_DEEPSEEK_MODELS   | deepseek_chat, deepseek-reasoner | 

### Ollama

| Key                   | Value                      | 
|:----------------------|:---------------------------|
| IFCLI_OLLAMA_API_KEY  | ''                         |
| IFCLI_OLLAMA_BASE_URL | http://localhost:11434/v1/ |
| IFCLI_OLLAMA_MODELS   | \<model1\>, \<model2\>     | 

### OpenAI

| Key                   | Value                     | 
|:----------------------|:--------------------------|
| IFCLI_OPENAI_API_KEY  | <your_openai_api_key>     |
| IFCLI_OPENAI_BASE_URL | https://api.openai.com/v1 |
| IFCLI_OPENAI_MODELS   | gpt-4o                    | 

## Command

```bash
Usage: ifct [options] [command]

ifcli chat with LLM

Options:
  -V, --version         output the version number
  -h, --help            display help for command

Commands:
  new <string>          new chat
  ask <string>          talk with agent
  list|ls               list all chats
  history|hs [options]  history questions
  remove|rm             remove chat
  change|ch             change to another chat
  prompt|pt [options]   prompt manager
  config|cf [options]   manage current chat configuration
  clear|cl              clear the current chat message
  help [command]        display help for command
```

### mcp tools support 

| Config Path | Platform                     |
|:------------|:-----------------------------|
| Windows     | $APPDATA/ifcli/mcp.json      |
| Mac/Linux   | $HOME/.config/ifcli/mcp.json |


```json
[
  {
    "type": ["tools"],
    "name": "weather",
    "version": "v1",
    "command": "node",
    "args": ["D:\\workspace\\other\\weather\\build\\index.js"]
  }
]
```
#### MCP Using Example

```bash
# Single Version
ifct ask "@weather What's the weather today?"

# Multi Version
ifct ask "@weather:v1 What's the weather today?"
```
