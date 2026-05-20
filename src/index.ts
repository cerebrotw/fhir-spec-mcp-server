#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchAndParse, fetchResourceSection, type ResourceSection } from "./utils/fetcher.js";
import { getHL7BaseUrl, BELGIAN_IGs } from "./utils/config.js";

const server = new McpServer({
  name: "fhir-spec-mcp-server",
  version: "1.0.0",
});

// ─── Tool 1: Get a FHIR resource page (optionally a specific section) ─────────
server.tool(
  "get_fhir_resource",
  `Fetch documentation for a specific FHIR resource from the HL7 specification.
Use the 'section' parameter to request only the part you need — this returns much less data than the full page:
- overview       : Scope, boundaries, and usage description
- structure      : Compact field-by-field definition table (name, cardinality, type, description)
- json           : JSON resource template/format
- xml            : XML resource template/format
- search-params  : All search parameters for this resource
- examples       : Fetch the separate examples sub-page (e.g. patient-examples.html)
Omit 'section' only if you genuinely need the full page.`,
  {
    resource_name: z
      .string()
      .describe("FHIR resource name (e.g. 'Patient', 'Observation', 'AllergyIntolerance'). Case-insensitive."),
    version: z
      .enum(["R5", "R4B", "R4", "STU3"])
      .default("R4")
      .describe("FHIR version. Defaults to R4."),
    section: z
      .enum(["overview", "structure", "json", "xml", "search-params", "examples"])
      .optional()
      .describe("Section of the resource page to fetch. Strongly preferred over fetching the full page."),
  },
  async ({ resource_name, version, section }) => {
    const baseName = resource_name.toLowerCase();
    const baseUrl  = getHL7BaseUrl(version);

    if (section === "examples") {
      const url = `${baseUrl}${baseName}-examples.html`;
      const content = await fetchAndParse(url);
      return { content: [{ type: "text", text: content }] };
    }

    if (section) {
      const url     = `${baseUrl}${baseName}.html`;
      const content = await fetchResourceSection(url, section as ResourceSection);
      return { content: [{ type: "text", text: content }] };
    }

    // No section requested: full page (use sparingly)
    const url     = `${baseUrl}${baseName}.html`;
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
    const url     = `${getHL7BaseUrl(version)}${path}`;
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
    const url     = `https://www.ehealth.fgov.be/standards/fhir/${ig.link}/${page_path}`;
    const content = await fetchAndParse(url);
    return { content: [{ type: "text", text: content }] };
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
