#!/usr/bin/env node
/**
 * YaniFend MCP — stdio proxy to the hosted YaniFend MCP server.
 *
 * Configured with a YaniFend account (email + password via MCPB user_config),
 * it signs in against the public auth API, opens an authenticated streamable-HTTP
 * MCP session to https://app.yanifend.com/mcp and forwards tools/list + tools/call
 * verbatim — every tool, schema and annotation comes from the hosted server.
 *
 * Without credentials it still serves the embedded tool catalog (introspection
 * for registries) and returns a configuration hint on any call.
 */
import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = (process.env.YANIFEND_BASE_URL ?? "https://app.yanifend.com").replace(/\/+$/, "");
const MCP_URL = `${BASE}/mcp`;
const EMAIL = process.env.YANIFEND_EMAIL ?? "";
const PASSWORD = process.env.YANIFEND_PASSWORD ?? "";

const FALLBACK: { tools: unknown[] } = JSON.parse(
  readFileSync(new URL("./tools-fallback.json", import.meta.url), "utf8"),
);

// ── Auth: password sign-in against the public YaniFend auth API ──────────────

let cachedToken: { value: string; exp: number } | null = null;

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - now > 30) return cachedToken.value;
  const res = await fetch(`${BASE}/back/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(
      `YaniFend sign-in failed (HTTP ${res.status}). Check the email/password in the extension settings.`,
    );
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("YaniFend sign-in returned no access token.");
  cachedToken = { value: body.access_token, exp: jwtExp(body.access_token) };
  return cachedToken.value;
}

// ── Remote MCP session (recreated when the short-lived token rolls over) ─────

let remote: { client: Client; tokenExp: number } | null = null;

async function remoteClient(): Promise<Client> {
  const now = Math.floor(Date.now() / 1000);
  if (remote && remote.tokenExp - now > 30) return remote.client;
  if (remote) {
    await remote.client.close().catch(() => {});
    remote = null;
  }
  const token = await accessToken();
  const client = new Client({ name: "yanifend-mcp-proxy", version: "0.3.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  remote = { client, tokenExp: cachedToken?.exp ?? now + 60 };
  return client;
}

async function withRemote<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  try {
    return await fn(await remoteClient());
  } catch (err) {
    // One retry with a forced re-auth — covers a token that expired mid-session.
    cachedToken = null;
    if (remote) {
      await remote.client.close().catch(() => {});
      remote = null;
    }
    void err;
    return await fn(await remoteClient());
  }
}

const configured = Boolean(EMAIL && PASSWORD);

// ── Prompts: local, no auth needed ────────────────────────────────────────────

type PromptDef = {
  name: string;
  description: string;
  arguments: { name: string; description: string; required?: boolean }[];
  template: (args: Record<string, string>) => string;
};

const PROMPTS: PromptDef[] = [
  {
    name: "new_feedback_form",
    description: "Create a new personage + questionary for a specific use case, then hand back the embed snippet.",
    arguments: [
      { name: "name", description: "Name for the new form / personage", required: true },
      { name: "goal", description: "What feedback you want to collect (e.g. post-checkout NPS)", required: true },
    ],
    template: (a) =>
      `Create a new YaniFend personage called "${a.name}" for this goal: ${a.goal}. ` +
      `Use create_personage, then design a short questionary for it with create_question / create_question_option ` +
      `(include a RATE question), and finally return the embed snippet from get_embed_snippet.`,
  },
  {
    name: "embed_widget",
    description: "Walk through embedding a personage's widget on a site, including the allowed-domains check.",
    arguments: [
      { name: "personage", description: "Personage name or id to embed", required: true },
      { name: "site", description: "The site origin you'll embed on, e.g. https://shop.example.com", required: true },
    ],
    template: (a) =>
      `I want to embed the "${a.personage}" YaniFend widget on ${a.site}. ` +
      `Fetch the embed snippet (get_embed_snippet) and check get_allowed_domains — if ${a.site} isn't listed, ` +
      `tell me exactly how to add it in the dashboard so it doesn't fail with a CORS error.`,
  },
  {
    name: "clone_form",
    description: "Copy an existing questionary onto another personage in one step.",
    arguments: [
      { name: "from", description: "Source personage (the form to copy)", required: true },
      { name: "to", description: "Target personage (to copy onto)", required: true },
    ],
    template: (a) =>
      `Copy the entire questionary from my "${a.from}" personage onto "${a.to}" using clone_questionary. ` +
      `First list_personages to resolve their ids, then clone, then list_questions on the target to confirm.`,
  },
  {
    name: "review_feedback",
    description: "Summarize the latest collected answers for a personage.",
    arguments: [{ name: "personage", description: "Personage whose answers to review", required: true }],
    template: (a) =>
      `Pull the latest answers for my "${a.personage}" personage with list_answers and summarize the themes, ` +
      `sentiment, and anything that needs follow-up.`,
  },
];

// ── Server ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "yanifend-mcp", version: "0.3.0" },
  { capabilities: { tools: {}, prompts: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (!configured) return { tools: FALLBACK.tools };
  try {
    return { tools: (await withRemote((c) => c.listTools())).tools };
  } catch {
    // Auth outage shouldn't blank the catalog — serve the embedded copy.
    return { tools: FALLBACK.tools };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (!configured) {
    return {
      content: [
        {
          type: "text",
          text:
            "YaniFend account not configured. Open the extension settings and enter the email and password " +
            "of your YaniFend account (sign up free at https://dashboard.yanifend.com), then try again.",
        },
      ],
      isError: true,
    };
  }
  return await withRemote((c) =>
    c.callTool({ name: req.params.name, arguments: req.params.arguments ?? {} }),
  );
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description, arguments: p.arguments })),
}));

server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const prompt = PROMPTS.find((p) => p.name === req.params.name);
  if (!prompt) {
    throw new Error(`Unknown prompt "${req.params.name}".`);
  }
  const args = (req.params.arguments ?? {}) as Record<string, string>;
  return {
    description: prompt.description,
    messages: [{ role: "user", content: { type: "text", text: prompt.template(args) } }],
  };
});

await server.connect(new StdioServerTransport());
