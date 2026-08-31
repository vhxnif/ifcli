---
name: pi-update
description: Update @earendil-works/pi-ai and pi-agent-core dependencies — evaluate breaking changes from release notes, centralize imports in base.ts, and verify
---

Update the core Pi SDK dependencies (`@earendil-works/pi-ai` and `@earendil-works/pi-agent-core`) to the latest version, handling breaking changes and keeping all Pi imports centralized in `packages/core/src/ai/base.ts`.

## Why base.ts matters

`packages/core/src/ai/base.ts` is the **single barrel file** for all Pi SDK imports. Every other file imports Pi types and functions from `base.ts` — not from `@earendil-works/*` directly. This means future breaking changes only require editing **one file** instead of 9+.

**ALWAYS** keep it this way. When adding new Pi SDK usage, import from `base.ts`, not from `@earendil-works/*`.

## Process

### 1. Check release notes

Visit https://pi.dev/news and find the latest version. Read the release notes for every version between the current and target, looking for:

- **Changed/Removed sections** — these are breaking changes
- API moves between entrypoints (`/compat`, `/base`, `/providers/all`)
- Type renames or discriminator changes
- Deprecated imports

### 2. Evaluate impact on Vein

The current Pi import surface used by Vein lives in `packages/core/src/ai/base.ts`. Check each import against the release notes:

| Import source | What we use | Notes |
|---|---|---|
| `pi-ai/compat` | `complete` | Old global API, still here as of 0.80.x |
| `pi-ai/providers/all` | `getBuiltinModel`, `getBuiltinModels`, `getBuiltinProviders` | Non-deprecated replacements for `getModel`/`getModels`/`getProviders` |
| `pi-ai` (root) | `Type`, `KnownProvider`, `Message`, `Tool` | Types and schema builder, stable |
| `pi-agent-core` (root) | `Agent`, `AgentMessage`, `AgentTool`, `AgentToolResult` | Stable |

### 3. Update package.json

Edit `packages/core/package.json` and bump both versions:

```json
"@earendil-works/pi-ai": "^X.Y.Z",
"@earendil-works/pi-agent-core": "^X.Y.Z",
```

Then install:

```bash
bun install
```

### 4. Update base.ts if needed

If the release notes indicate import path changes, update `packages/core/src/ai/base.ts`:

- Switch import paths (`/compat`, `/providers/all`, root)
- If APIs are renamed, create local aliases (e.g., `const getModel = getBuiltinModel`)
- Keep the same re-exports so consumer files don't need changes

### 5. Verify

```bash
bun run check    # typecheck — must be clean
bun run build    # bundle — must succeed
bun run lint     # no errors, no deprecated imports
```

### 6. Smoke test

```bash
bun run --filter @vein/cli build
# Then test basic CLI operations
```

## Anti-patterns

- **NEVER** import from `@earendil-works/*` in files other than `base.ts` — always go through the barrel
- **NEVER** skip the lint step — deprecated imports will be caught here even if typecheck passes
- **NEVER** use `@earendil-works/pi-ai/base` or `@earendil-works/pi-agent-core/base` — these were removed in 0.80.0

## History

- **0.80.7 → 0.80.10** (Jul 2026): No breaking changes for vein. Breaking upstream (0.80.8): `AuthStorage`/`ModelRegistry` → `ModelRuntime` (not used by vein). New (0.80.9): Kimi K3, deferred tool loading, removed old Grok 3/4.20 models. Fix (0.80.10): restored xAI models.
