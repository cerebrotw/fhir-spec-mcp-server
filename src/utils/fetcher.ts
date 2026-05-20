import axios from "axios";
import { load, type CheerioAPI } from "cheerio";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Drop images entirely — they're structural/decorative on FHIR spec pages
turndown.addRule("images", {
  filter: "img",
  replacement: () => "",
});

// ─── Raw HTML cache (shared between full-page and section requests) ───────────
interface HtmlCacheEntry {
  html: string;
  timestamp: number;
}

const htmlCache = new Map<string, HtmlCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchHtmlCached(url: string): Promise<string> {
  const cached = htmlCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.html;
  }
  try {
    const response = await axios.get<string>(url, {
      headers: { "User-Agent": "FHIR-MCP-Server/1.0 (documentation assistant)" },
      timeout: 20_000,
      responseType: "text",
    });
    htmlCache.set(url, { html: response.data, timestamp: Date.now() });
    return response.data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch ${url}: ${msg}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ResourceSection = "overview" | "structure" | "json" | "xml" | "search-params";

/** Fetch a full page and return the main content as markdown. */
export async function fetchAndParse(url: string): Promise<string> {
  const html = await fetchHtmlCached(url);
  return extractMainContent(url, html);
}

/** Fetch a specific section of an HL7 FHIR resource page. */
export async function fetchResourceSection(url: string, section: ResourceSection): Promise<string> {
  const html = await fetchHtmlCached(url);
  return extractSection(url, html, section);
}

// ─── Content extraction ───────────────────────────────────────────────────────

function removeChrome($: CheerioAPI): void {
  $(
    "script, style, link, meta, " +
    "#segment-header, #segment-navbar, #segment-breadcrumb, #segment-footer, " +
    "nav, footer, header, .navbar, .breadcrumb, " +
    "#footer-placeholder, #navbar-placeholder, " +
    "p#publish-box-past, ul.nav-tabs"
  ).remove();
}

function extractMainContent(url: string, html: string): string {
  const $ = load(html);
  removeChrome($);

  const mainEl =
    $("#segment-content").length ? $("#segment-content") :
    $("main").length             ? $("main")             :
    $("#content").length         ? $("#content")         :
    $(".container").first();

  const markdown = turndown.turndown(mainEl.html() ?? $("body").html() ?? html);
  return `*Source: ${url}*\n\n${markdown.replace(/\n{3,}/g, "\n\n").trim()}`;
}

function extractSection(url: string, html: string, section: ResourceSection): string {
  const $ = load(html);
  removeChrome($);

  let content: string;

  switch (section) {
    case "overview":
      content = extractOverview($);
      break;
    case "structure":
      content = extractStructure($);
      break;
    case "json":
      content = extractPreSection($, "#tabs-json", "JSON Template");
      break;
    case "xml":
      content = extractPreSection($, "#tabs-xml", "XML Template");
      break;
    case "search-params":
      content = extractSearchParams($);
      break;
  }

  return `*Source: ${url} (section: ${section})*\n\n${content.replace(/\n{3,}/g, "\n\n").trim()}`;
}

// ─── Section extractors ───────────────────────────────────────────────────────

function extractOverview($: CheerioAPI): string {
  // Remove the tabs block and the "Resource Content" heading that precedes it
  $("#tabs").remove();
  // Remove search parameters section (everything from its heading to end of content)
  $("h2, h3").each((_, el) => {
    if ($(el).text().includes("Search Parameters")) {
      $(el).nextAll().addBack().remove();
    }
  });
  // Remove "Resource Content" heading (section 9.x.3 etc.)
  $("h2").each((_, el) => {
    if ($(el).text().includes("Resource Content")) {
      $(el).remove();
    }
  });

  const mainEl =
    $("#segment-content").length ? $("#segment-content") :
    $("main").length             ? $("main")             :
    $(".inner-wrapper").first();

  return turndown.turndown(mainEl.html() ?? "");
}

function extractStructure($: CheerioAPI): string {
  const rows = $("#tbl-inner table tr");
  if (!rows.length) {
    // Fallback: turndown the whole section
    return turndown.turndown($("#tabs-struc").html() ?? "Structure table not found.");
  }

  const lines: string[] = ["**Resource Structure**\n"];

  rows.each((_, row) => {
    const cells = $(row).children("td");
    if (cells.length < 4) return; // header row has th, not td

    const nameCell = $(cells[0]);

    // Indentation = number of non-spacer tbl_ images preceding the field icon
    let indent = 0;
    nameCell.find("img.hierarchy").each((_, img) => {
      const src = $(img).attr("src") ?? "";
      if (src.startsWith("tbl_") && src !== "tbl_spacer.png") indent++;
    });

    // Field name: prefer a link to the definitions page, fall back to titled span
    const nameLink = nameCell.find("a[href*='-definitions']").first();
    const nameSpan = nameCell.find("span[title]").first();
    const fieldName = (nameLink.text() || nameSpan.text()).trim();
    if (!fieldName) return;

    const cardinality = $(cells[2]).text().trim();
    const type        = $(cells[3]).text().trim().replace(/\s+/g, " ");
    // Description: first 200 chars, collapse whitespace
    const desc        = $(cells[4]).text().replace(/\s+/g, " ").trim().substring(0, 200);

    const pad = "  ".repeat(indent);
    const parts: string[] = [`${pad}**${fieldName}**`];
    if (cardinality) parts.push(`[${cardinality}]`);
    if (type && type !== fieldName) parts.push(`\`${type}\``);
    if (desc) parts.push(`– ${desc}`);

    lines.push(parts.join(" "));
  });

  return lines.join("\n");
}

function extractPreSection($: CheerioAPI, selector: string, label: string): string {
  const container = $(selector);
  if (!container.length) return `${label} section not found on this page.`;

  const pre = container.find("pre").first();
  if (pre.length) {
    // .text() strips HTML tags cleanly; decode &lt; &gt; etc.
    const text = pre.text().trim();
    const lang = label.toLowerCase().startsWith("json") ? "json" : "xml";
    return `**${label}**\n\n\`\`\`${lang}\n${text}\n\`\`\``;
  }

  return turndown.turndown(container.html() ?? "");
}

function extractSearchParams($: CheerioAPI): string {
  // Find the "Search Parameters" heading, then take it and everything that follows
  let found = false;
  const parts: string[] = [];

  $("h2, h3, table").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if ((tag === "h2" || tag === "h3") && $(el).text().includes("Search Parameters")) {
      found = true;
    }
    if (found) {
      parts.push($.html(el) ?? "");
    }
  });

  if (!parts.length) {
    // Fallback: find table with sp- anchored rows
    const spTable = $("a[name^='sp-']").first().closest("table");
    if (spTable.length) return turndown.turndown(spTable.prop("outerHTML") ?? "");
    return "Search parameters section not found on this page.";
  }

  return turndown.turndown(parts.join("\n"));
}
