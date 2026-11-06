import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const publicOriginRaw = (process.env.PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
const basePathRaw = (process.env.PUBLIC_BASE_PATH || "").trim().replace(/\/+$/, "");
const routeManifest = JSON.parse(await fs.readFile(path.join(root, "manus-routes.json"), "utf8"));
const copyItems = ["index.html", "404.html", "assets", "guides", "privacy", "about", "manus-routes.json"];
const routeKeywords = {
  "/": ["CSV import checker", "CSV validator online", "compare CSV files by key", "CSV preflight", "browser CSV checker"],
  "/guides/csv-import-checklist/": ["CSV import checklist", "prepare CSV before import", "CSV format errors", "CSV duplicate header checker", "CSV import troubleshooting"],
  "/guides/shopify-csv-safety/": ["Shopify product CSV", "Shopify CSV import guide", "Shopify variant fields", "Shopify product update checklist", "Shopify CSV safety"],
  "/privacy/": ["private CSV validator", "browser CSV processing", "local CSV validation", "CSV file privacy"],
  "/about/": ["RowReady CSV checker", "browser-first CSV tool", "CSV import preparation", "local CSV validation"]
};

let publicOrigin = "";
if (publicOriginRaw) {
  let parsed;
  try { parsed = new URL(publicOriginRaw); } catch { throw new Error("PUBLIC_ORIGIN must be an absolute HTTPS origin such as https://rowready.example."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("PUBLIC_ORIGIN must be a real HTTPS origin only (scheme + host, no path, credentials, query or hash).");
  }
  publicOrigin = parsed.origin;
}
if (basePathRaw && (!publicOrigin || !/^\/(?!\.)(?:[A-Za-z0-9._~-]+)(?:\/[A-Za-z0-9._~-]+)*$/.test(basePathRaw) || basePathRaw.split("/").some((part) => part === "." || part === ".."))) {
  throw new Error("PUBLIC_BASE_PATH must be a simple URL path such as /WEBSITE and requires PUBLIC_ORIGIN.");
}
const siteBase = publicOrigin ? `${publicOrigin}${basePathRaw}` : "";

await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
for (const item of copyItems) {
  const source = path.join(root, item);
  try { await fs.access(source); } catch { throw new Error(`Required publication item is missing: ${item}`); }
  await fs.cp(source, path.join(out, item), { recursive: true });
}

const pageFile = (route) => route === "/" ? "index.html" : path.join(route.replace(/^\//, ""), "index.html");
const escapeJSON = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const pages = [];
for (const route of routeManifest.routes) {
  if (!route.path.startsWith("/") || route.path.includes(":") || route.path.includes("*")) throw new Error(`Only concrete public page routes belong in the sitemap: ${route.path}`);
  const relativeFile = pageFile(route.path);
  const filePath = path.join(out, relativeFile);
  let html = await fs.readFile(filePath, "utf8");
  const keywords = routeKeywords[route.path] || ["CSV import checker", "CSV validation", "RowReady"];
  const keywordMeta = `<meta name="keywords" content="${keywords.join(", ")}">`;
  html = html.replace(/<meta\s+name="keywords"[^>]*>\s*/i, "");
  if (basePathRaw) {
    html = html.replace(/\b(href|src|action)\s*=\s*(["'])\/(?!\/)([^"']*)\2/gi, (_whole, attribute, quote, target) => `${attribute}=${quote}${basePathRaw}/${target}${quote}`);
  }
  const canonical = publicOrigin ? `${siteBase}${route.path === "/" ? "/" : route.path}` : "";
  if (publicOrigin) {
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || route.title || "RowReady";
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || "";
    const pageGraph = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "name": "RowReady", "url": `${siteBase}/` },
        { "@type": "WebPage", "name": title, "description": description, "url": canonical, "inLanguage": "en" },
        { "@type": "BreadcrumbList", "itemListElement": route.path === "/" ? [{ "@type": "ListItem", "position": 1, "name": "RowReady", "item": `${siteBase}/` }] : [
          { "@type": "ListItem", "position": 1, "name": "RowReady", "item": `${siteBase}/` },
          { "@type": "ListItem", "position": 2, "name": route.title || title, "item": canonical }
        ] }
      ]
    };
    const absoluteMeta = `${keywordMeta}\n<link rel="canonical" href="${canonical}">\n<meta property="og:url" content="${canonical}">\n<meta property="og:image" content="${siteBase}/assets/og-card.svg">\n<meta property="og:image:alt" content="RowReady CSV import checker preview card">\n<meta name="twitter:image" content="${siteBase}/assets/og-card.svg">\n<script type="application/ld+json">${escapeJSON(pageGraph)}</script>`;
    html = html.replace(/<\/head>/i, `${absoluteMeta}\n</head>`);
    html = html.replace(/"item"\s*:\s*"\/([^\"]*)"/g, (_whole, p) => `"item":"${siteBase}/${p}"`);
  } else html = html.replace(/<\/head>/i, `${keywordMeta}\n</head>`);
  await fs.writeFile(filePath, html, "utf8");
  pages.push({ route: route.path, canonical, title: route.title || "" });
}

if (basePathRaw) {
  const notFoundPath = path.join(out, "404.html");
  const notFoundHTML = await fs.readFile(notFoundPath, "utf8");
  await fs.writeFile(notFoundPath, notFoundHTML.replace(/\b(href|src|action)\s*=\s*(["'])\/(?!\/)([^"']*)\2/gi, (_whole, attribute, quote, target) => `${attribute}=${quote}${basePathRaw}/${target}${quote}`), "utf8");
  const appPath = path.join(out, "assets", "app.js");
  const appCode = await fs.readFile(appPath, "utf8");
  await fs.writeFile(appPath, appCode.replace(/(href)="\/([^\"]*)"/g, (_whole, attribute, target) => `${attribute}="${basePathRaw}/${target}"`), "utf8");
}

const robots = publicOrigin
  ? `User-agent: *\nAllow: /\nSitemap: ${siteBase}/sitemap.xml\n`
  : "User-agent: *\nAllow: /\n# Set PUBLIC_ORIGIN and rebuild to add an absolute Sitemap URL.\n";
await fs.writeFile(path.join(out, "robots.txt"), robots, "utf8");
if (publicOrigin) {
  const entries = pages.map((page) => `  <url><loc>${page.canonical.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</loc></url>`).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  await fs.writeFile(path.join(out, "sitemap.xml"), sitemap, "utf8");
} else {
  await fs.rm(path.join(out, "sitemap.xml"), { force: true });
}

console.log(`RowReady static build complete: ${pages.length} public pages → dist/${publicOrigin ? `(site: ${siteBase})` : "(no canonical/sitemap origin configured)"}`);
