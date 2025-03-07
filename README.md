# ifcli

## Install 
```bash
# install bun
npm install -g bun
```

## From NPM
```bash
npm install -g @vhxnif/ifcli
```

## From Source Code
```bash
bun install && 
bun run build && 
bun link
```

## Config
```bash
export OPENAI_API_KEY=<your_deepseek_key>
```

| Key                 | Value                    | 
|:--------------------|:-------------------------|
| OPENAI_API_KEY      | \<your_deepseek_key\>    |
| OPENAI_BASE_URL     | https://api.deepseek.com |
| IFCLI_CUSTOM_MODELS | \<model1\>,\<model2\>    | 
| IFCLI_DEFAULT_MODEL | deepseek-chat            |


## Command

### chat 

```bash
Usage: ifct [options] [command]

ifcli chat with LLM

Options:
  -V, --version     output the version number
  -h, --help        display help for command

Commands:
  new <string>      new chat
  ask <string>      talk with agent
  list              list all chats
  history           history questions
  remove            remove chat
  change            change to another chat
  prompt [options]  prompt manager
  config [options]  manage current chat configuration
  clear             clear the current chat message
  help [command]    display help for command
```


#### mcp tools support 

| Config Path | Platform                     |
|:------------|:-----------------------------|
| Windows     | $APPDATA/ifcli/mcp.json      |
| Mac         | $HOME/.config/ifcli/mcp.json |
| Linux       | $HOME/.config/ifcli/mcp.json |


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
##### MCP Using Example

```bash
# Single Version
ifct ask "@weather What's the weather today?"

# Multi Version
ifct ask "@weather:v1 What's the weather today?"
```

This project was created using `bun init` in [bun v1.1.36.](https://bun.sh) is a fast all-in-one JavaScript runtime.
