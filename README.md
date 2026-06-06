# YaniFend MCP Server

Manage your YaniFend feedback questionary and read answers directly from Claude (Desktop, Code, or claude.ai) via the Model Context Protocol.

YaniFend is a WordPress-native feedback widget that lets visitors leave structured feedback on your site. This MCP server lets an LLM client work with the YaniFend backoffice on behalf of a logged-in site owner — list personages, manage questions, and pull in collected answers — without leaving the chat.

## Endpoint

```
https://app.yanifend.com/mcp
```

Streamable-HTTP transport. OAuth 2.1 (PKCE, RFC 7591 Dynamic Client Registration). No pre-registration required — Claude Desktop / claude.ai will auto-register on first connect.

## Compatible clients

- Claude Desktop (custom connector)
- Claude Code (`/mcp add ...`)
- claude.ai web (Connectors → Add custom)
- Any MCP client that supports remote HTTP transport + OAuth 2.1 DCR

## Tools

| Tool | What it does |
|---|---|
| `list_personages` | List the feedback personages defined on the connected YaniFend site |
| `list_questions` | Read the current questionary |
| `create_question` | Add a new question |
| `update_question` | Edit an existing question's text/type/order |
| `delete_question` | Remove a question |
| `list_question_options` | List options for a multiple-choice question |
| `create_question_option` | Add an option to a question |
| `update_question_option` | Edit an option |
| `delete_question_option` | Remove an option |
| `list_answers` | Pull the latest collected answers |

Every tool is scoped to the authenticated YaniFend account — you only see and edit your own site's data.

## Install

### Claude Desktop / claude.ai

Add a custom connector:

- **Name:** YaniFend
- **URL:** `https://app.yanifend.com/mcp`

On first use you'll be redirected to YaniFend's hosted login (Google / GitHub / Facebook / LinkedIn / email) and asked to authorize the connector.

### Claude Code

```sh
claude mcp add --transport http yanifend https://app.yanifend.com/mcp
```

## About YaniFend

[yanifend.com](https://yanifend.com) — a WordPress plugin that lets HR / recruiter / SaaS sites collect structured visitor feedback with personage-based segmentation. The MCP server is the LLM-native way to manage your YaniFend instance.

## Status

Production. Hosted at `https://app.yanifend.com/mcp`. Source for the WordPress plugin and backend live in private GitLab repos; this repository exists as the public listing entry for the hosted MCP service.

## Contact

Issues / questions: open one in this repo, or reach out via [yanifend.com](https://yanifend.com).
