#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const REMOTE = process.env.YANIFEND_MCP_URL ?? "https://app.yanifend.com/mcp";

const TOOLS = [
  { name: "list_personages", desc: "List the feedback personages on the connected YaniFend site." },
  { name: "list_questions", desc: "Read the current questionary." },
  { name: "create_question", desc: "Add a new question to the questionary." },
  { name: "update_question", desc: "Edit an existing question's text, type, or order." },
  { name: "delete_question", desc: "Remove a question from the questionary." },
  { name: "list_question_options", desc: "List options for a multiple-choice question." },
  { name: "create_question_option", desc: "Add an option to a question." },
  { name: "update_question_option", desc: "Edit an existing option." },
  { name: "delete_question_option", desc: "Remove an option." },
  { name: "list_answers", desc: "Pull the latest collected answers." },
];

const server = new Server(
  { name: "yanifend-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.desc,
    inputSchema: { type: "object", properties: {}, additionalProperties: true },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => ({
  content: [
    {
      type: "text",
      text:
        `Tool "${req.params.name}" must be executed against the hosted YaniFend MCP at ${REMOTE}.\n\n` +
        `This stdio wrapper exists for registry introspection. To actually run tools, connect your MCP client ` +
        `(Claude Desktop / claude.ai / Claude Code) directly to ${REMOTE} — it handles the OAuth 2.1 (PKCE + DCR) ` +
        `flow against the user's YaniFend account.`,
    },
  ],
  isError: true,
}));

await server.connect(new StdioServerTransport());
