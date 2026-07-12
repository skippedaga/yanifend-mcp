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

## Alternative: desktop extension / local stdio proxy (this repo)

This repository ships a stdio MCP server that proxies to the hosted endpoint. Configure it
with your YaniFend account email + password (via the desktop-extension settings, or the
`YANIFEND_EMAIL` / `YANIFEND_PASSWORD` env vars) and it signs in over HTTPS and forwards
every tool call to `https://app.yanifend.com/mcp` — same 33 tools, same schemas and
annotations, strictly scoped to your own account. Without credentials it still serves the
tool catalog for registry introspection and returns a configuration hint on any call.

```sh
npx -y yanifend-mcp
# or
docker build -t yanifend-mcp . && docker run --rm -i yanifend-mcp
```

As a **Claude Desktop extension**: install the `.mcpb` bundle (built with
`npx @anthropic-ai/mcpb pack`), then enter your YaniFend email and password in the
extension settings. The password is stored by Claude Desktop's OS keychain and is only
ever sent to `app.yanifend.com`.

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

**Notifications** (hosted endpoint + authenticated proxy)

| Tool | What it does |
|---|---|
| `list_notification_event_types` | Event types you can route (feedback submitted, low rating, …) |
| `list_notification_channels` / `create_notification_channel` / `update_notification_channel` / `delete_notification_channel` | Manage delivery channels (Telegram, Slack, email, …) |
| `list_notification_routes` / `set_notification_route` / `delete_notification_route` | Wire event types to channels |
| `list_notification_deliveries` | Delivery log |
| `send_test_notification` | Fire a test message through a channel |

Plus `set_character` / `get_character` (personage look), `update_widget_style`, and
`delete_personage`. Every tool is scoped to the authenticated YaniFend account — you only
see and edit your own site's data.

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

## Privacy Policy

Full policy: **https://yanifend.com/privacy**

- **Data collection.** The extension collects only the YaniFend account credentials you
  enter in its settings and the tool inputs you provide in chat. It does not read files,
  browsing history, or anything else on your machine.
- **Usage and storage.** Credentials are stored locally by Claude Desktop (OS keychain)
  and used solely to obtain a short-lived access token from `app.yanifend.com` over
  HTTPS. Tool calls and results flow directly between your machine and the YaniFend API;
  this extension keeps no database and writes no logs of your data.
- **Third-party sharing.** Nothing is sent to any party other than YaniFend
  (`app.yanifend.com`). No analytics, no trackers.
- **Data retention.** The extension itself retains nothing beyond the in-memory session
  token (discarded on exit). Feedback data lives in your YaniFend account and follows the
  retention terms of the YaniFend privacy policy; deleting your account cascades all of it.
- **Contact.** support@yanifend.com

## License

MIT — see [LICENSE](./LICENSE).
