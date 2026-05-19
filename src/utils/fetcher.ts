import axios from "axios";
import { load } from "cheerio";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Remove image tags but keep their alt text as context
turndown.addRule("images", {
  filter: "img",
  replacement: (_content, node) => {
    const alt = (node as Element).getAttribute?.("alt") ?? "";
    return alt ? `[image: ${alt}]` : "";
  },
});

interface CacheEntry {
  content: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchAndParse(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.content;
  }

  let html: string;
  try {
    const response = await axios.get<string>(url, {
      headers: { "User-Agent": "FHIR-MCP-Server/1.0 (documentation assistant)" },
      timeout: 20_000,
      responseType: "text",
    });
    html = response.data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch ${url}: ${msg}`);
  }

  const content = extractMainContent(url, html);
  cache.set(url, { content, timestamp: Date.now() });
  return content;
}

function extractMainContent(url: string, html: string): string {
  const $ = load(html);

  // Strip chrome that adds noise
  $(
    "script, style, link, meta, " +
    "#segment-header, #segment-navbar, #segment-breadcrumb, #segment-footer, " +
    "nav, footer, header, .navbar, .breadcrumb, " +
    "#footer-placeholder, #navbar-placeholder"
  ).remove();

  // HL7 FHIR spec uses #segment-content; FHIR IG Publisher uses #segment-content or div#content
  const mainEl =
    $("#segment-content").length ? $("#segment-content") :
    $("main").length           ? $("main") :
    $("#content").length       ? $("#content") :
    $(".container").first();

  const innerHtml = mainEl.html() ?? $("body").html() ?? html;

  const markdown = turndown.turndown(innerHtml);

  // Trim excessive blank lines
  const cleaned = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return `*Source: ${url}*\n\n${cleaned}`;
}
