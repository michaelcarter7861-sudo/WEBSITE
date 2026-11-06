# RowReady — Keyword and intent map

**Research date:** 6 November 2026. **Method:** manually inspect live search results and representative tool/documentation pages for the proposed CSV-import workflow. This is a qualitative opportunity map, not a keyword-volume forecast. No paid keyword-volume database or Search Console property was available, so no search counts, difficulty values, CPCs, or ranking promises are made.

## Positioning decision

The first concept—another generic CSV validator—has a direct competitor set and is not an empty market. The site therefore combines the approved browser-first validator with a more specific evidence-led job: **review a new CSV and compare changes before an update import**, with a documented Shopify product-variant warning. Do not market it as the only tool, a Shopify validator, or a guaranteed import pass. The checker does not access a destination account.

A recent Shopify Community thread asked merchants what they still fix by hand when updating supplier prices/stock. Its replies describe SKU mismatches/duplicates, variant omissions, protecting customized fields, unexpected changes, and a manual compare-against-current-export workflow. That is qualitative pain evidence from an open forum, not a representative market survey. A separate recent community post promotes a paid browser tool for Shopify supplier price review; its existence is direct evidence that the narrower idea is competitive rather than unoccupied.

## Cluster and page map

| Cluster | Example user query language | Intent and job | Destination | Content/product response |
|---|---|---|---|---|
| General CSV preflight | `CSV import checker`, `CSV validator online`, `check CSV before import`, `CSV file checker` | Transactional: inspect a file immediately before uploading it elsewhere | `/` | Working, local-first validator; issues, rules, file copy and report; explicit limit that passing checks is not platform approval |
| Structural CSV errors | `CSV inconsistent columns`, `CSV duplicate header checker`, `CSV malformed row`, `CSV empty rows before import` | Troubleshooting: find why a file may fail or shift values | `/` and `/guides/csv-import-checklist/` | Row/column findings, structure checks and a substantial checklist with internal links |
| Compare versions / import changes | `compare CSV files by key`, `compare old and new CSV before import`, `CSV changed rows checker` | Transactional: review added, missing, duplicated or changed rows from a recurring export | `/` | Two-file comparison using user-selected matching keys; downloadable change report; visible warning that the report includes changed values |
| Shopify update safety | `Shopify product CSV update checker`, `Shopify CSV variant option columns`, `Shopify product import variant warning` | High-intent troubleshooting: reduce avoidable risks in a product update CSV | `/guides/shopify-csv-safety/` plus profile on `/` | Source-linked explanation of Shopify's handle/title requirement and its documented Option1 dependency; never claim affiliation or guarantee |
| Privacy/local processing | `validate CSV in browser`, `private CSV checker`, `CSV validator no upload` | Tool selection: assess whether data is uploaded or retained | `/privacy/` and FAQs on `/` | Implementation-specific statement: browser-side processing; account for ordinary static-host requests; report-download caveat |
| General preparation/how-to | `CSV import checklist`, `prepare CSV before upload`, `CSV errors before import` | Informational: learn the checks and workflow | `/guides/csv-import-checklist/` | Original procedural checklist with examples, decision points and limitations, not a thin keyword landing page |

## Competitive evidence reviewed

- [CSVImportChecker](https://csvimportchecker.com/) — focused browser-based CSV preflight offering destination templates and checks; direct overlap with general validation and privacy positioning.
- [ConvertCSV CSV validator](https://www.convertcsv.com/csv-validator.html) — broad, established online CSV validation utilities; direct feature competition.
- [Dedupe.ly CSV validator](https://dedupe.ly/tools/csv-validator) — duplicate-focused validation; overlap with data-quality checks.
- [ToolkitBay CSV validator](https://toolkitbay.com/tools/validator/csv-validator) — another general online validation result; confirms a crowded generic SERP.
- [Datablist CSV diff](https://www.datablist.com/tools/csv-diff) — compares files and changes by keys; direct overlap with comparison mode.
- [Csvio supplier price update help](https://csvio.app/help/update-prices-from-supplier-file) — Shopify app workflow for updating prices from supplier lists; confirms adjacent paid competition.
- [Supplier Update Guard offer on Shopify Community](https://community.shopify.com/t/review-supplier-csv-prices-before-a-shopify-import-19-once/700040) — a paid browser tool reviewing supplier price changes against an export; direct overlap with Shopify update-safety intent.

The observed pages do not prove exact search volumes, conversion rates, or absence of other competitors. RowReady's practical difference is its combined local preflight, customizable repeatable rules, keyed comparison and source-linked variant-field caveat in one small tool—not a claim that no competitors exist.

## Primary user evidence and official sources

- [Shopify Community: “What do you still fix by hand when updating supplier prices or stock?”](https://community.shopify.com/t/what-do-you-still-fix-by-hand-when-updating-supplier-prices-or-stock/692332) — opened and read 6 November 2026. Recent merchant discussion; manual reconciliation, key mismatches, protecting non-target fields, and risky/unexpected changes were described. Small, self-selected discussion; not representative.
- [Shopify Help Center: Using CSV files to import and export products](https://help.shopify.com/en/manual/products/import-export/using-csv) — opened and read 6 November 2026. Official source for the current product CSV header, handle/title update requirements and the warning that omitting Option1 fields in applicable variant updates can create a default variant and delete existing variants. Recheck the live page before changing the tool's profile.
- [Google Search Central: FAQ structured data](https://developers.google.com/search/docs/appearance/structured-data/faqpage) — opened 6 November 2026. Google's changelog says it removed the FAQ rich-result documentation in June 2026 and deprecated the FAQ rich-result feature in May 2026. The site therefore has visible FAQs and Schema.org FAQ markup as requested, but does not promise a Google FAQ enhancement.
- [Google Search Central: structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) — guidance for truthful, page-matched markup; do not add fake ratings or reviews.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) — primary hosting-limit reference. Recheck before setting up the project, especially current free-plan and build configuration.
- [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) — primary source for the `https://<owner>.github.io/<repository>` project-site URL shape and its visitor-IP logging disclosure.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Pages REST API](https://docs.github.com/rest/pages/pages) — official Actions artifact/deploy flow and site `build_type` configuration.

## Content and technical SEO choices

- Each indexable route has an initial-HTML title, description, body content, social tags, internal links and one distinct intent. No text is hidden behind app execution.
- Canonical URLs, `og:url`, social-image URLs and `sitemap.xml` are produced only when an actual HTTPS `PUBLIC_ORIGIN` is configured for the deployed host. The build never guesses the public host.
- `robots.txt` permits public pages; it references the generated sitemap only when the origin is known. `manus-routes.json` lists only the five intended content routes, not the 404, assets or system documents.
- Visible FAQs answer real product/privacy questions. FAQ JSON-LD is present on the homepage to match visible copy, but Google FAQ rich results are not promised because the feature was deprecated in Google's current documentation.
- `WebApplication`, `WebSite`, `Organization`, `WebPage` and `BreadcrumbList` markup describe the actual tool. No customer ratings, reviews, author credentials, use counts or certification claims are invented.
- Query language on pages is natural and restrained. No templated location pages or unsupported platform claims are created.

## What still needs owner-side validation

1. Enable GitHub Pages on `michaelcarter7861-sudo/WEBSITE` with the source set to GitHub Actions; confirm the deployed URL matches `PUBLIC_ORIGIN` plus `/WEBSITE` and the workflow succeeds.
2. Visit the deployed sitemap and check `robots.txt`. Project Pages use a repository subpath; submit `https://michaelcarter7861-sudo.github.io/WEBSITE/sitemap.xml` directly in Google Search Console/Bing Webmaster Tools if the sitemap is not discovered automatically. There is no verified property or search-performance data at build time.
3. Validate actual query demand and indexation over time using Search Console and user interviews. Manual result inspection is not a substitute for measured impressions.
4. Ask several real CSV users to try their own files and tasks; address browser/device issues and verify whether they actually reuse saved rules/comparison.
5. If monetizing, choose and approve a real ad or affiliate provider; add consent/disclosure and re-review privacy/hosting policies. No revenue system is connected in this initial release.
