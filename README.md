# YaniFend MCP Server

Manage your YaniFend feedback questionary and read collected answers directly from Claude (Desktop, Code, or claude.ai) via the Model Context Protocol.

YaniFend is a WordPress-native feedback widget that lets visitors leave structured feedback on your site. This MCP server lets an LLM client work with the YaniFend backoffice on behalf of a logged-in site owner — list personages, manage questions, and pull in collected answers — without leaving the chat.

[![skippedaga/yanifend-mcp MCP server](https://glama.ai/mcp/servers/skippedaga/yanifend-mcp/badges/score.svg)](https://glama.ai/mcp/servers/skippedaga/yanifend-mcp)

## Recommended: hosted endpoint

```
https://app.yanifend.com/mcp
```

Streamable HTTP transport, OAuth 2.1 (PKCE + RFC 7591 Dynamic Client Registration). No pre-registration — Claude Desktop / claude.ai auto-register on first connect, then prompt you to log in to YaniFend (Google / GitHub / Facebook / LinkedIn / email).

### Claude Desktop / claude.ai

Add a custom connector:
- **Name:** YaniFend
- **URL:** `https://app.yanifend.com/mcp`

### Claude Code

```sh
claude mcp add --transport http yanifend https://app.yanifend.com/mcp
```

## Alternative: local stdio wrapper (this repo)

This repository ships a tiny stdio MCP wrapper, mainly so the server can be introspected by registries like Glama and mcp.directory. It advertises the same tool surface as the hosted endpoint but delegates actual execution there — calling a tool returns a hint to use the hosted URL, because tool calls need an authenticated YaniFend account.

```sh
npx -y yanifend-mcp
# or
docker build -t yanifend-mcp . && docker run --rm -i yanifend-mcp
```

## Tools

| Tool | What it does |
|---|---|
| `list_personages` | List the feedback personages defined on the connected YaniFend site |
| `list_questions` | Read the current questionary |
| `create_question` | Add a new question |
| `update_question` | Edit an existing question's text, type, or order |
| `delete_question` | Remove a question |
| `list_question_options` | List options for a multiple-choice question |
| `create_question_option` | Add an option to a question |
| `update_question_option` | Edit an option |
| `delete_question_option` | Remove an option |
| `list_answers` | Pull the latest collected answers |

Every tool is scoped to the authenticated YaniFend account — you only see and edit your own site's data.

## About YaniFend

[yanifend.com](https://yanifend.com) — a WordPress plugin that lets HR / recruiter / SaaS sites collect structured visitor feedback with personage-based segmentation. The MCP server is the LLM-native way to manage your YaniFend instance.

## License

MIT — see [LICENSE](./LICENSE).
