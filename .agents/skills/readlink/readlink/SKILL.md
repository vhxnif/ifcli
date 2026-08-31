---
name: readlink
description: Reads URL content and converts it to clean markdown format using pandoc
---

# Readlink Skill

This skill helps you read web page content from URLs and convert them to clean markdown.

## When to Use This Skill

Use this skill when the user:
- Provides a URL and wants to read the page content
- Asks to fetch or retrieve content from a link
- Wants to convert web pages to markdown format
- Needs to analyze or summarize web page content

## Prerequisites

This skill requires the following tools to be installed:
- `curl` - For fetching HTML content (usually pre-installed on most systems)
- `pandoc` - For converting HTML to markdown. If not installed, this skill cannot be used.

To check if pandoc is installed:
```bash
pandoc --version
```

## How It Works

This skill uses:
- `curl` - to fetch HTML content from URLs
- `pandoc` - to convert HTML to clean markdown
- A lua filter - to remove navigation, ads, scripts, and other noise

### Command to Execute

1. **Fetch and convert in one command:**
   ```bash
   curl -sL "<url>" | pandoc -f html -t markdown_strict --lua-filter <skill-dir>/clean_markdown.lua
   ```
   
   Where `<skill-dir>` is the path shown in the "Base directory" message at the top of this skill content.

   Example: If base directory is `/Users/username/.agents/skills/readlink`, the filter path is:
   ```
   /Users/username/.agents/skills/readlink/clean_markdown.lua
   ```

2. **Use curl with -L flag**: Always use `curl -sL` (not just `curl -s`) to follow URL redirects. Many URLs redirect before reaching the actual content.

3. **Quote URLs**: Wrap URLs in quotes to handle special characters in query parameters.

## Lua Filter

The `clean_markdown.lua` filter removes:
- Navigation elements (nav, menu, sidebar)
- Advertisements and promotional content
- Scripts, styles, and comments
- Social sharing widgets
- Footers and headers
- Popups and overlays
- Pagination and breadcrumbs
- Images and figure elements

This provides a clean, readable markdown output focused on the main text content.

## Usage Examples

### Example 1: Read a simple URL
```
User: Read the content from https://example.com/article
Agent: curl -sL "https://example.com/article" | pandoc -f html -t markdown_strict --lua-filter /Users/username/.agents/skills/readlink/clean_markdown.lua
```

### Example 2: Read a URL with redirects
```
User: Summarize this Substack article: https://substack.com/app-link/post?...
Agent: # First get the redirect URL, then fetch content
curl -sL "https://substack.com/..." | pandoc -f html -t markdown_strict --lua-filter /Users/username/.agents/skills/readlink/clean_markdown.lua
```

### Example 3: Extract content from multiple URLs
```
User: Read these articles and compare them:
- https://site1.com/post1
- https://site2.com/post2
Agent: # Fetch each URL with curl -sL, convert with pandoc, then compare
```

## Script Location

The lua filter (`clean_markdown.lua`) is located in:
- Same directory as this SKILL.md file
- File list in the skill content shows: `<skill-dir>/clean_markdown.lua`

To construct the full path:
- Look at the "Base directory for this skill" line at the top of this skill content
- Append `/clean_markdown.lua` to it
- Example: `file:///Users/username/.agents/skills/readlink/clean_markdown.lua` 
         → `/Users/username/.agents/skills/readlink/clean_markdown.lua`

## Complete Example

```bash
# If base directory is: /Users/username/.agents/skills/readlink

curl -sL "https://example.com/article" | pandoc -f html -t markdown_strict --lua-filter /Users/username/.agents/skills/readlink/clean_markdown.lua
```

## Error Handling

If pandoc is not installed, inform the user:
```
This skill requires pandoc to be installed. Please install it first:
- macOS: brew install pandoc
- Ubuntu/Debian: sudo apt install pandoc
- Windows: choco install pandoc
```

## Notes

- The skill works best with well-structured HTML pages
- Complex JavaScript-rendered content may not be captured (curl only fetches static HTML)
- The lua filter focuses on extracting main content and removing noise
- Output is plain markdown without formatting preset retention
- **Always use `-sL` flags with curl**: `-s` for silent mode, `-L` to follow redirects
- **Wrap URLs in double quotes**: Prevents shell issues with query parameters and special characters
- **Check for pandoc**: Verify pandoc is installed with `pandoc --version` before using this skill