# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ifcli is a TypeScript-based CLI application for chatting with AI models through the command line. It supports multiple AI providers (OpenAI, DeepSeek, Ollama, OpenRouter) and includes MCP (Model Context Protocol) server integration.

## Development Commands

### Building
```bash
bun run build
```
Builds the TypeScript source files into the `build/` directory using Bun's native bundler.

### Code Quality
```bash
# Lint code (ESLint configured)
bunx eslint src/

# Format code (Prettier configured)
bunx prettier --write src/
```

## Architecture

### Core Structure
- **Commands**: Two main CLI commands in `src/`:
  - `chat-command.ts` - Main chat interface (`ifchat`/`ict`)
  - `setting-command.ts` - Configuration management (`ifsetting`/`ist`)
- **Actions**: Business logic in `src/action/`:
  - `chat-action.ts` - Chat session management and AI interactions
  - `setting-action.ts` - Application settings management
- **LLM Integration**: AI provider clients in `src/llm/`:
  - `open-ai-client.ts` - OpenAI-compatible API client
  - `mcp-client.ts` - Model Context Protocol client
  - `ask-flow.ts` - Main AI interaction orchestration
- **Storage**: SQLite database management in `src/store/`:
  - `store.ts` - High-level data operations
  - `db-client.ts` - Low-level SQLite operations
- **Configuration**: App settings and types in `src/config/`
- **UI Components**: Terminal display components in `src/component/`
- **Utilities**: Helper functions in `src/util/`

### Key Design Patterns

1. **Command Pattern**: CLI commands use Commander.js with clear separation between command definition and action execution
2. **Repository Pattern**: Store layer abstracts database operations from business logic
3. **Strategy Pattern**: Multiple LLM providers supported through common interface
4. **Dependency Injection**: App context provides shared dependencies (store, actions, color themes)

### Data Storage
- SQLite database with version-specific naming (`ifcli_<version>.sqlite`)
- Platform-specific data directories:
  - Windows: `%APPDATA%\ifcli`
  - macOS/Linux: `$HOME/.config/ifcli`
- Stores chat sessions, topics, messages, prompts, and application settings

### Configuration System
- JSON-based configuration with schema validation
- Supports multiple LLM providers with API keys and model lists
- MCP server configuration for SSE, stdio, and streamable transports
- Theme system with Catppuccin color schemes

## Development Guidelines

### Code Quality Checks

#### ESLint Validation
After making code changes, always run ESLint to ensure code style consistency:
```bash
# Check all source files
bunx eslint src/

# Check specific file
bunx eslint src/path/to/file.ts

# Auto-fix fixable issues
bunx eslint src/ --fix
```

#### IDE Configuration
Ensure your IDE is configured with the following settings:
- **TypeScript**: Enable strict mode and type checking
- **ESLint**: Enable automatic linting on save
- **Prettier**: Configure to match project style (single quotes, no semicolons)
- **EditorConfig**: Use 4-space indentation

#### Pre-Change Validation Checklist
Before committing changes, verify:
1. ✅ ESLint passes without errors
2. ✅ TypeScript compilation succeeds (`bun run build`)
3. ✅ Code follows project style guidelines
4. ✅ No console warnings in development mode

### Code Style
- **Semicolons**: Disabled (ESLint rule: `semi: ['error', 'never']`)
- **Quotes**: Single quotes preferred
- **Indentation**: 4 spaces
- **TypeScript**: Strict mode enabled with comprehensive type definitions

### Adding New Features
1. **New Commands**: Add to existing command files or create new ones following the Commander.js pattern
2. **LLM Providers**: Implement `ILLMClient` interface in `src/llm/`
3. **Database Changes**: Update schema in `src/store/table-def.ts` and add operations in `db-client.ts`
4. **UI Components**: Extend existing display components in `src/component/`

### Testing Considerations
- No test framework currently configured
- Manual testing through CLI commands recommended
- Focus on chat session management and AI provider integration

### Dependencies
- **Runtime**: Bun.js (>=1.2.6), OpenAI SDK, MCP SDK
- **CLI**: Commander.js, Inquirer for interactive prompts
- **UI**: Chalk for colors, Ora for spinners, Table for formatted output
- **Build**: Bun's native TypeScript compilation

## Common Development Tasks

### Adding a New LLM Provider
1. Add provider configuration to `AppSetting` type in `src/config/app-setting.ts`
2. Implement `ILLMClient` interface in `src/llm/`
3. Update provider selection logic in `chat-action.ts`

### Creating New Chat Commands
1. Add command definition to `chat-command.ts`
2. Implement corresponding method in `ChatAction` class
3. Add any necessary store operations in `store.ts`

### Database Schema Changes
1. Update table definitions in `src/store/table-def.ts`
2. Add SQL operations in `src/store/db-client.ts`
3. Update TypeScript interfaces in `src/store/store-types.ts`
4. Add store layer methods in `src/store/store.ts`

## Configuration Management

The application uses a hierarchical configuration system:
- **Application Settings**: Global settings (themes, LLM providers, MCP servers)
- **Chat Configuration**: Per-chat settings (model, context size, system prompts)
- **Chat Extensions**: Extended configuration (MCP server selections)

Configuration is managed through the `ifsetting` command and stored in the SQLite database.