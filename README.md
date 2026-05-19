# FHIR MCP Server

[![npm version](https://img.shields.io/npm/v/fhir-spec-mcp-server)](https://www.npmjs.com/package/fhir-spec-mcp-server)
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

## Installation

No installation required. Add to your MCP client configuration:
- **GitHub Copilot**: `~/.copilot/mcp.json`
- **Claude Desktop**: `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fhir-docs": {
      "command": "npx",
      "args": ["-y", "fhir-spec-mcp-server"]
    }
  }
}
```

`npx` will download and run the server automatically — no cloning or building needed.

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
git clone https://github.com/cerebrotw/fhir-mcp-server.git
cd fhir-mcp-server
npm install
npm run dev   # Run with tsx (no build needed)
```
