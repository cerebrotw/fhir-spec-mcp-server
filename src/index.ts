import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchAndParse } from "./utils/fetcher.js";
import { getHL7BaseUrl, BELGIAN_IGs } from "./utils/config.js";

const server = new McpServer({
  name: "fhir-mcp-server",
  version: "1.0.0",
});

// ─── Tool 1: Get a FHIR resource page ────────────────────────────────────────
server.tool(
  "get_fhir_resource",
  "Fetch the definition page for a specific FHIR resource from the HL7 specification (e.g. Patient, Observation, Encounter, Bundle). Prefer R4 unless the user specifies a version.",
  {
    resource_name: z
      .string()
      .describe("FHIR resource name (e.g. 'Patient', 'Observation', 'Encounter'). Case-insensitive."),
    version: z
      .enum(["R5", "R4B", "R4", "STU3"])
      .default("R4")
      .describe("FHIR version. Defaults to R4."),
  },
  async ({ resource_name, version }) => {
    const url = `${getHL7BaseUrl(version)}${resource_name.toLowerCase()}.html`;
    const content = await fetchAndParse(url);
    return { content: [{ type: "text", text: content }] };
  }
);

// ─── Tool 2: Get any HL7 FHIR spec page ──────────────────────────────────────
server.tool(
  "get_fhir_page",
  "Fetch any page from the HL7 FHIR specification by its filename/path (e.g. 'search.html', 'http.html', 'terminology-service.html', 'resourcelist.html').",
  {
    path: z
      .string()
      .describe("Page filename or path within the spec (e.g. 'search.html', 'datatypes.html')."),
    version: z
      .enum(["R5", "R4B", "R4", "STU3"])
      .default("R4")
      .describe("FHIR version. Defaults to R4."),
  },
  async ({ path, version }) => {
    const url = `${getHL7BaseUrl(version)}${path}`;
    const content = await fetchAndParse(url);
    return { content: [{ type: "text", text: content }] };
  }
);

// ─── Tool 3: List Belgian IGs ─────────────────────────────────────────────────
server.tool(
  "list_belgian_igs",
  "List all available Belgian FHIR Implementation Guides published by the eHealth Platform at https://www.ehealth.fgov.be/standards/fhir/.",
  {},
  async () => {
    const lines = BELGIAN_IGs.map(
      ig =>
        `**${ig.title}** (\`${ig.git}\`)\n` +
        `  ${ig.desc}\n` +
        `  URL: https://www.ehealth.fgov.be/standards/fhir/${ig.link}/index.html`
    );
    return {
      content: [{ type: "text", text: lines.join("\n\n") }],
    };
  }
);

// ─── Tool 4: Get a Belgian IG page ───────────────────────────────────────────
server.tool(
  "get_belgian_ig_page",
  "Fetch a page from a Belgian FHIR Implementation Guide. Use 'list_belgian_igs' to discover valid IG names. Common page paths: index.html, artifacts.html, profiles.html, extensions.html, terminology.html.",
  {
    ig_name: z
      .string()
      .describe(
        "IG identifier (git name). Use list_belgian_igs to see all options (e.g. 'core', 'medication', 'lab', 'vaccination')."
      ),
    page_path: z
      .string()
      .default("index.html")
      .describe("Page path within the IG (e.g. 'artifacts.html'). Defaults to 'index.html'."),
  },
  async ({ ig_name, page_path }) => {
    const ig = BELGIAN_IGs.find(i => i.git === ig_name);
    if (!ig) {
      const valid = BELGIAN_IGs.map(i => i.git).join(", ");
      throw new Error(`Unknown IG '${ig_name}'. Valid names: ${valid}`);
    }
    const url = `https://www.ehealth.fgov.be/standards/fhir/${ig.link}/${page_path}`;
    const content = await fetchAndParse(url);
    return { content: [{ type: "text", text: content }] };
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
