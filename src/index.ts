#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const REMOTE = process.env.YANIFEND_MCP_URL ?? "https://app.yanifend.com/mcp";

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

type ToolDef = { name: string; description: string; inputSchema: JsonSchema };

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const bool = (description: string) => ({ type: "boolean", description });

const schema = (properties: Record<string, unknown>, required: string[] = []): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const RATE_MIN = int("RATE only: lowest value on the scale (e.g. 1).");
const RATE_MAX = int("RATE only: highest value on the scale (e.g. 5 or 10).");
const RATE_ICON = str('RATE only: icon/character to render per step, e.g. "★".');

const TOOLS: ToolDef[] = [
  // ── Personages & integration ──────────────────────────────────────────
  {
    name: "list_personages",
    description: "List the feedback personages (form characters) on the connected YaniFend site, with id and name.",
    inputSchema: schema({}),
  },
  {
    name: "create_personage",
    description:
      "Create a NEW personage — a fresh questionary plus its own character and an embeddable API key. This is how you " +
      "add a new questionary. Plan-limited (FREE = 1, BASIC = 5, PRO = unlimited); on the limit, upgrade or reuse the " +
      "existing questionary.",
    inputSchema: schema(
      {
        name: str('Display name for the new personage / form, e.g. "Checkout Survey".'),
        templatePersonageId: int("Optional id of a seeded template personage to clone the character animations from."),
      },
      ["name"],
    ),
  },
  {
    name: "get_company_profile",
    description:
      "Read the client's company profile: name, site URL, allowed widget domains, industry, size, language, plan tier, " +
      "contacts, plus plan limits (personageLimit / personagesUsed) and a planNote.",
    inputSchema: schema({}),
  },
  {
    name: "get_allowed_domains",
    description:
      "Read the client's allowed widget domains (the CORS allow-list) and get step-by-step instructions for adding one " +
      "in the dashboard. A domain must be listed before the widget will load on it.",
    inputSchema: schema({}),
  },
  {
    name: "list_integration_keys",
    description:
      "Get the embed credentials for every personage: id, name, public API key, widget script URL and a ready-to-paste " +
      "<script> tag.",
    inputSchema: schema({}),
  },
  {
    name: "get_embed_snippet",
    description: "Get the ready-to-paste embed (api key + widget URL + <script> tag) for ONE personage.",
    inputSchema: schema({ personageId: int("Id of the personage to embed.") }, ["personageId"]),
  },
  // ── Questions ─────────────────────────────────────────────────────────
  {
    name: "list_questions",
    description: "Read the questionary of a personage, ordered by step. Includes each question's options.",
    inputSchema: schema({ personageId: int("Id of the personage whose questionary to read.") }, ["personageId"]),
  },
  {
    name: "create_question",
    description:
      "Add a new question to a personage's questionary. type ∈ TEXT, TEXTAREA, OPTION, RATE, MULTIPLE_CHOICE, CHECKBOX, " +
      "DROPDOWN, DATE, TIME, DATETIME, NUMBER, FILE_UPLOAD, EMAIL, PHONE, WEBSITE, IMAGE_UPLOAD. Auto-wires an animation.",
    inputSchema: schema(
      {
        personageId: int("Id of the personage to add the question to."),
        text: str("The question text shown to respondents."),
        type: str("Question type, e.g. TEXT or OPTION."),
        step: int("1-based position in the form; omit to append."),
        isOptional: bool("Whether the respondent may skip this question (default false)."),
        minVal: RATE_MIN,
        maxVal: RATE_MAX,
        rateIcon: RATE_ICON,
      },
      ["personageId", "text", "type"],
    ),
  },
  {
    name: "update_question",
    description: "Edit a question. Only the fields you pass are changed. Supports RATE scale (minVal/maxVal) and icon.",
    inputSchema: schema(
      {
        questionId: int("Id of the question to update."),
        text: str("New question text."),
        type: str("New question type."),
        step: int("New 1-based position in the form."),
        isOptional: bool("New optional flag."),
        minVal: RATE_MIN,
        maxVal: RATE_MAX,
        rateIcon: RATE_ICON,
      },
      ["questionId"],
    ),
  },
  {
    name: "delete_question",
    description: "Delete a question (fails if it is the last one in the form).",
    inputSchema: schema({ questionId: int("Id of the question to delete.") }, ["questionId"]),
  },
  // ── Options ───────────────────────────────────────────────────────────
  {
    name: "list_question_options",
    description: "List the answer options of a choice-style question, in render order.",
    inputSchema: schema({ questionId: int("Id of the question whose options to read.") }, ["questionId"]),
  },
  {
    name: "create_question_option",
    description:
      "Add an answer option. actionType ∈ CONTINUE, CLOSE, NOTIFY_MANAGER, GOTO_QUESTION (actionPayload = target " +
      "question id for GOTO_QUESTION). Optional position sets render order.",
    inputSchema: schema(
      {
        questionId: int("Id of the question to add the option to."),
        text: str("Option text shown to respondents."),
        isCheckbox: bool("Whether this option renders as a checkbox (default false)."),
        actionType: str("Action on selection: CONTINUE, CLOSE, NOTIFY_MANAGER or GOTO_QUESTION."),
        actionPayload: str("NOTIFY_MANAGER note, or the target question id for GOTO_QUESTION."),
        position: int("1-based render position; omit to append."),
      },
      ["questionId", "text"],
    ),
  },
  {
    name: "update_question_option",
    description: "Edit an answer option. Only the fields you pass are changed; position moves it without delete/recreate.",
    inputSchema: schema(
      {
        optionId: int("Id of the option to update."),
        text: str("New option text."),
        isCheckbox: bool("New checkbox flag."),
        actionType: str("New action: CONTINUE, CLOSE, NOTIFY_MANAGER or GOTO_QUESTION."),
        actionPayload: str("New action payload (applied when actionType is also given)."),
        position: int("New 1-based render position."),
      },
      ["optionId"],
    ),
  },
  {
    name: "delete_question_option",
    description: "Remove an answer option from a choice-style question.",
    inputSchema: schema({ optionId: int("Id of the option to delete.") }, ["optionId"]),
  },
  {
    name: "reorder_question_options",
    description:
      "Reorder a question's options without delete/recreate. Pass every option id of the question exactly once, in the " +
      "desired top-to-bottom order.",
    inputSchema: schema(
      {
        questionId: int("Id of the question whose options to reorder."),
        orderedOptionIds: {
          type: "array",
          items: { type: "integer" },
          description: "All of the question's option ids, in the desired order.",
        },
      },
      ["questionId", "orderedOptionIds"],
    ),
  },
  // ── Cloning, answers, hosted forms ────────────────────────────────────
  {
    name: "clone_questionary",
    description:
      "Copy ALL questions + options from one personage's questionary onto another in one call. Appends by default; " +
      "replace=true clears the target first.",
    inputSchema: schema(
      {
        fromPersonageId: int("Personage to copy the questionary FROM."),
        toPersonageId: int("Personage to copy the questionary INTO."),
        replace: bool("If true, delete the target's existing questions first (default false = append)."),
      },
      ["fromPersonageId", "toPersonageId"],
    ),
  },
  {
    name: "list_answers",
    description: "Pull the latest collected answers for a personage's questionary, newest first.",
    inputSchema: schema(
      {
        personageId: int("Id of the personage whose answers to fetch."),
        limit: int("Max number of answers to return (default 50)."),
      },
      ["personageId"],
    ),
  },
  {
    name: "list_hosted_forms",
    description:
      "List the client's hosted forms — shareable /f/{slug} feedback pages that need no website embed and aren't subject " +
      "to allowed-domains/CORS.",
    inputSchema: schema({}),
  },
  {
    name: "create_hosted_form",
    description: "Create a shareable hosted form (/f/{slug}) for a personage — an alternative to embedding the widget.",
    inputSchema: schema(
      {
        personageId: int("Personage whose questionary the hosted form collects answers for."),
        name: str('Optional display name (defaults to "Feedback").'),
      },
      ["personageId"],
    ),
  },
];

// MCP prompts — reusable starting points an end user can pick in the client UI. The `{{arg}}`
// placeholders are filled from the prompt arguments and rendered into a user message.
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

const server = new Server(
  { name: "yanifend-mcp", version: "0.2.0" },
  { capabilities: { tools: {}, prompts: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));

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
