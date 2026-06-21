# YaniFend MCP Server

Manage your YaniFend feedback questionary and read collected answers directly from Claude (Desktop, Code, or claude.ai) via the Model Context Protocol.

YaniFend is a drop-in feedback widget that lets visitors leave structured feedback on **any** website — a single script tag, no framework required (custom sites, SPAs, WordPress, and more). This MCP server lets an LLM client work with the YaniFend backoffice on behalf of a logged-in site owner — list personages, manage questions, and pull in collected answers — without leaving the chat.

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

**Personages & integration**

| Tool | What it does |
|---|---|
| `list_personages` | List the feedback personages on the connected YaniFend site |
| `create_personage` | Create a new personage = a new questionary + character + embeddable API key (plan-limited) |
| `get_company_profile` | Read company profile + plan limits (personages used / allowed) |
| `get_allowed_domains` | Read the widget's allowed domains (CORS) + how to add one |
| `list_integration_keys` | API key + ready-to-paste embed snippet for every personage |
| `get_embed_snippet` | Embed snippet (key + `<script>` tag) for one personage |

**Questionary authoring**

| Tool | What it does |
|---|---|
| `list_questions` | Read the current questionary |
| `create_question` | Add a question (incl. RATE scale + icon); auto-wires an animation |
| `update_question` | Edit a question's text, type, order, or RATE config |
| `delete_question` | Remove a question |
| `list_question_options` | List options for a choice-style question |
| `create_question_option` | Add an option (CONTINUE / CLOSE / NOTIFY_MANAGER / GOTO_QUESTION; optional position) |
| `update_question_option` | Edit an option |
| `delete_question_option` | Remove an option |
| `reorder_question_options` | Reorder options without delete/recreate |
| `clone_questionary` | Copy all questions + options from one personage onto another in one call |

**Answers & hosted forms**

| Tool | What it does |
|---|---|
| `list_answers` | Pull the latest collected answers |
| `list_hosted_forms` | List shareable `/f/{slug}` feedback pages (no embed, no CORS) |
| `create_hosted_form` | Create a shareable hosted form for a personage |

Every tool is scoped to the authenticated YaniFend account — you only see and edit your own site's data.

## Prompts

Reusable starting points your MCP client can offer:

| Prompt | What it does |
|---|---|
| `new_feedback_form` | Spin up a new personage + questionary for a goal, then return the embed snippet |
| `embed_widget` | Walk through embedding a widget on a site, incl. the allowed-domains check |
| `clone_form` | Copy an existing questionary onto another personage |
| `review_feedback` | Summarize the latest collected answers for a personage |

## About YaniFend

[yanifend.com](https://yanifend.com) — a feedback widget that lets any website (HR / recruiter / SaaS / e-commerce, custom-built or WordPress) collect structured visitor feedback with personage-based segmentation. Drop in one script tag, or use the WordPress plugin. The MCP server is the LLM-native way to manage your YaniFend instance.

## License

MIT — see [LICENSE](./LICENSE).
