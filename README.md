# FHIR MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP (Model Context Protocol) server that provides access to FHIR documentation from:
- **HL7 International** – FHIR R4, R4B, R5, STU3 specification pages
- **Belgian eHealth Platform** – FHIR Implementation Guides

## Tools

| Tool | Description |
|---|---|
| `get_fhir_resource` | Fetch a FHIR resource definition (e.g. Patient, Observation) from HL7 spec |
| `get_fhir_page` | Fetch any page from the HL7 FHIR spec by filename (e.g. `search.html`) |
| `list_belgian_igs` | List all Belgian FHIR Implementation Guides |
| `get_belgian_ig_page` | Fetch a page from a Belgian IG (e.g. core, medication, lab) |

## Build

```bash
npm install
npm run build
```

## Configure in GitHub Copilot / Claude Desktop

Add to your MCP client configuration (e.g. `~/.copilot/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fhir-docs": {
      "command": "node",
      "args": ["/path/to/fhir-mcp-server/dist/index.js"]
    }
  }
}
```

## Example usage

- *"What are the search parameters for the Observation resource in FHIR R4?"*  
  → `get_fhir_resource("Observation", "R4")`

- *"How does FHIR pagination work?"*  
  → `get_fhir_page("http.html", "R4")`

- *"Show me the Belgian Core profiles"*  
  → `get_belgian_ig_page("core", "index.html")`

- *"What Belgian IGs are available?"*  
  → `list_belgian_igs()`

## Development

```bash
npm run dev   # Run with tsx (no build needed)
```
