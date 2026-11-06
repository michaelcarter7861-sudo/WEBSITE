# RowReady

RowReady is a static, browser-first CSV/TSV preflight checker. Its parser, rule checks, two-file comparison and export run in the visitor's browser. It has no app server, database, AI API, account system, analytics script, paid service or third-party runtime dependency.

## Local development

Requires Node.js 20+ and Python 3; no package installation is needed.

```sh
npm run build
npm run preview
```

Open `http://localhost:3000`. The development server serves the project root. The production build writes the public site to `dist/` and copies only the website files and route manifest.

## Static hosting

The connected `michaelcarter7861-sudo/WEBSITE` repository is prepared for free GitHub Pages publication as a static project site. `.github/workflows/pages.yml` builds `dist/` and publishes it when `main` changes, but Pages is not yet enabled in repository settings; set the Pages source to **GitHub Actions**. The expected project-site address is `https://michaelcarter7861-sudo.github.io/WEBSITE/`, based on GitHub's documented project URL pattern; verify the actual URL in repository Pages settings after deployment.

- GitHub Actions build command: `npm run build`
- GitHub Actions artifact directory: `dist`
- The workflow sets `PUBLIC_ORIGIN` to the HTTPS host and `PUBLIC_BASE_PATH` to `/WEBSITE`; both must match the actual deployed origin and repository path.
- To use Cloudflare Pages instead, build with `npm run build`, publish `dist/`, set `PUBLIC_ORIGIN` to the actual HTTPS Pages domain, and leave `PUBLIC_BASE_PATH` unset because Cloudflare serves from the domain root.

The build rejects a non-HTTPS or malformed origin/base path. With a real `PUBLIC_ORIGIN`, it injects each page's canonical and Open Graph URLs, includes social-image metadata, writes an absolute route-matched `sitemap.xml`, and writes `robots.txt` with its sitemap reference. With no origin, it intentionally omits canonical URLs and the sitemap instead of guessing a domain. Never use a placeholder URL for a public build.

GitHub's docs note that a project site lives under `/<repositoryname>/`; the build therefore rewrites root-relative asset and page links to `/WEBSITE/`. GitHub also states it logs visitor IP addresses for security. The privacy page distinguishes normal host request logging from browser-side CSV processing. To use another repository path or host, change the workflow's origin/base path rather than reusing these values blindly.

## Implemented features

- CSV/TSV parsing with quoted cells, embedded line breaks, BOM removal, delimiter detection and malformed-quote warnings.
- Header, row-width, empty-row, duplicate-row, encoding-symptom and optional per-column checks.
- Editable rules for required fields, types, uniqueness, numeric ranges, allowed values and whitespace.
- Starting profiles for general checks, contact lists, product catalogs and Shopify product update warnings.
- Optional safe copy fixes: trim selected fields and exclude empty records; never modify the source file.
- Importable/exportable rule profiles; local browser storage is attempted only when the user saves a profile.
- Compare two CSVs by user-selected key and download a change report.
- English crawlable landing page, two original guides, privacy and about pages, FAQ content, structured data, route manifest and origin-aware SEO file generation.

## Limits and scope

The current app accepts CSV/TSV files up to 10 MB. Browser memory and performance vary. The Shopify profile checks a limited set of common headers and one documented variant-column dependency; it does not read a Shopify store, cover every version or import rule, or guarantee acceptance. The comparison report includes changed values when the user downloads it. Always keep a backup and review the destination's own import preview.

## Research and search work

See [`SEO_KEYWORD_MAP.md`](SEO_KEYWORD_MAP.md) for query-intent clusters, manual SERP observations, direct competitor links and source-based content decisions. No search-volume figures are asserted. This project does not guarantee ranking or traffic.

## Revenue status

The current release has no advertising, affiliate links, subscriptions or payment processing. Revenue cannot be promised or created just by shipping the website; it will require a real monetization account/approval, relevant traffic, transparent disclosures and compliance with the chosen host's policies. This repository keeps external monetization scripts out until the owner chooses and configures them.

## Public pages

- `/`
- `/guides/csv-import-checklist/`
- `/guides/shopify-csv-safety/`
- `/privacy/`
- `/about/`
