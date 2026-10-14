---
name: kas-regu-3-mcp-bundle
description: Bundled MCP config for KAS REGU 3 project — filesystem access + persistent memory for cross-session notes.
---

# KAS REGU 3 — MCP Bundle

This skill provides MCP (Model Context Protocol) tools for this project. When invoked, the following tools become available:

## FileSystem Tools
- `read_file` — read file contents
- `write_file` — write/create files
- `edit_file` — make surgical edits (replace exact string)
- `glob` — find files by pattern
- `grep` — search file contents
- `list_directory` — list directory contents
- `get_file_info` — metadata about a file

**Working directory**: `C:/Security Data/Documents/REPORT SECURITY/Michael/Cash`

## Memory Tools
- `memory_write` — persist facts to long-term memory
- `memory_read` — retrieve facts from memory
- `memory_list` — list all memory entries
- `memory_delete` — remove a memory entry

## Usage Notes
- Always use absolute paths with filesystem tools
- The project root is the Git repository at `C:/Security Data/Documents/REPORT SECURITY/Michael/Cash`
- For D1 operations, continue using `wrangler d1 execute` CLI as documented in CLAUDE.md
- Use memory tools to track project decisions that persist across sessions

## Related Skills
- `antislop` — AI coding rules (load before heavy refactors)
- `antislop-layoutmobile` — mobile layout validation (load before responsive changes)
- `security-review` — security audit (load before auth/R2 changes)
- `code-review` — diff review (load before commits)
