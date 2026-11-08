# RowReady market-validation sprint

**Status:** hypothesis to test; not evidence of demand  
**Product:** RowReady, browser-only CSV checker and two-file comparison tool  
**Decision:** do not expand generic CSV comparison until this test produces buyer evidence.

## What the market evidence says

- Generic CSV validation and supplier-file comparison are crowded.
- A Shopify Community post already describes a free browser-based Supplier File Audit with duplicate/missing SKU, price, and product-change checks. This is a direct overlap with RowReady's current broad comparison proposition.
- Shopify's own documentation warns that product CSV imports can remove dependent data when related columns are omitted. This creates a specific risk worth testing, but it does not prove buyers will pay for another tool.

## Narrow hypothesis

For Shopify merchants who perform **price-only updates from supplier files**, a pre-import audit that identifies every changed field outside the approved price columns will prevent accidental catalog edits and save manual review time.

This is a hypothesis, not a product claim.

## Target buyer

Start with operators who:
- manage a Shopify catalog with at least a few hundred variants;
- receive recurring supplier CSV/XLSX price or stock lists;
- currently use spreadsheets, formulas, scripts, agencies, or apps to reconcile updates;
- can describe a recent costly or time-consuming mistake.

Do not target every Shopify merchant. Merchants with small catalogs or no recurring supplier feeds are unlikely to feel this pain strongly.

## Proposed differentiated workflow

1. Merchant selects the existing Shopify catalog export as the baseline.
2. Merchant selects the supplier-prepared update or edited Shopify CSV.
3. Merchant chooses which columns are intentionally allowed to change (for example, Variant Price only).
4. RowReady matches records using a merchant-selected identifier and reports:
   - duplicate, blank, missing, and unmatched identifiers;
   - changed values in allowed columns;
   - **unexpected changes in every other shared column**;
   - added or removed rows and columns;
   - a downloadable review report.
5. RowReady never writes to Shopify and never claims an import is guaranteed safe.

The differentiator is not “compare two CSVs.” It is “prove that only the fields you intended to change actually changed.”

## Validation before building

### Interview questions

Ask a merchant to walk through their last real supplier price update:
1. How often do supplier price or stock files arrive?
2. How many products/variants are involved?
3. How do you match supplier rows to Shopify variants today?
4. Which fields are allowed to change in a price-only update?
5. How do you detect accidental changes to other fields?
6. What was the last mistake or near miss, and what did it cost in time, money, or lost sales?
7. What tools or people do you currently pay to solve this?
8. Would you provide two anonymized sample files for a local/browser-only prototype test?

Do not ask “Would you use this?” or accept compliments as validation. Ask for a recent example, current workaround, measurable cost, and a concrete next step.

### Evidence threshold

Proceed to build the dedicated workflow only after:
- 8 qualified merchant conversations;
- at least 5 confirm this exact price-only/unintended-field-change problem from recent experience;
- at least 3 share anonymized sample files or agree to a guided test;
- at least 2 agree to a paid pilot or make a specific purchase commitment.

If the thresholds are not met, revise or abandon the wedge instead of adding more features.

## Pilot offer to test

A manual, no-store-access audit of one baseline export and one intended update file. Return:
- a before/after change report;
- a list of non-approved field changes;
- ambiguous and unmatched identifiers;
- a draft of the safe next-step workflow.

A small fixed-price pilot can be tested after the problem is confirmed. Do not collect payment before agreeing scope, file handling, and delivery expectations. Never request Shopify passwords, customer personal data, or live-store access.

## Outreach message

Hi — I’m researching how Shopify stores handle supplier price-only updates. When a supplier sends a new price list, how do you make sure the import changes prices but doesn't accidentally overwrite SKUs, variants, barcodes, images, or other product fields?

I’m not pitching an app. I’m looking for 15 minutes to understand your current workflow and, if useful, test an anonymized pair of CSV files in a browser-only prototype. No store login is needed. Would you be open to sharing how you handle the last update?

## Risks and guardrails

- Existing products already offer generic CSV comparison; do not compete on a feature checklist.
- Shopify CSV behavior varies by import mode, headers, and store setup. Keep the tool advisory and require the merchant to review Shopify's own import preview.
- Supplier files may contain confidential pricing or product information. Test with anonymized copies and process locally.
- Do not claim prevented losses, guaranteed safe imports, customer adoption, SEO rankings, or revenue without measured evidence.
- Brand name RowReady has same-name collisions identified in prior research. Resolve naming before investing in paid promotion or a custom domain.

## Current decision

**Build status:** no dedicated price-only guardrail has been implemented.  
**Demand status:** unvalidated.  
**Next milestone:** obtain qualified merchant interviews and anonymized sample-file tests.