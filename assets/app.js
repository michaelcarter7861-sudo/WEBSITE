import { analyzeCSV, applySafeFixes, compareCSVData, makeDefaultRules, makeSampleCSV, parseCSV, stringifyCSV } from "./csv-engine.js";

const $ = (id) => document.getElementById(id);
const MAX_BYTES = 10 * 1024 * 1024;
const state = {
  file: null, rawText: null, parsed: null, hasHeader: true, profile: "general", rules: {}, analysis: null, exportRows: null, appliedFixes: null,
  baseline: null, incoming: null, comparison: null
};

const profileCopy = {
  general: "Check file structure, then choose extra rules for your columns.",
  shopify: "A product-update starting profile with a documented variant-field warning. It cannot inspect your store or guarantee acceptance.",
  contacts: "Checks an email-like column and repeated values when one is detected. Adjust required fields to match your import destination.",
  catalog: "Starts with SKU and price checks where matching column names are present. Choose the rules that fit your catalog."
};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
function humanBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function delimiterName(delimiter) {
  if (delimiter === "\t") return "tab-separated";
  if (delimiter === ";") return "semicolon-separated";
  if (delimiter === "|") return "pipe-separated";
  return "comma-separated";
}
function setTab(mode) {
  const check = mode === "check";
  $("tab-check").classList.toggle("is-active", check);
  $("tab-check").setAttribute("aria-selected", String(check));
  $("tab-compare").classList.toggle("is-active", !check);
  $("tab-compare").setAttribute("aria-selected", String(!check));
  $("tab-check").tabIndex = check ? 0 : -1;
  $("tab-compare").tabIndex = check ? -1 : 0;
  $("panel-check").hidden = !check;
  $("panel-compare").hidden = check;
}
const appTabs = [...document.querySelectorAll(".app-tab")];
appTabs.forEach((tab) => tab.addEventListener("click", () => setTab(tab.dataset.mode)));
setTab("check");
document.querySelector(".app-tabs").addEventListener("keydown", (event) => {
  const current = appTabs.indexOf(document.activeElement);
  if (current < 0) return;
  let next = current;
  if (event.key === "ArrowRight") next = (current + 1) % appTabs.length;
  else if (event.key === "ArrowLeft") next = (current + appTabs.length - 1) % appTabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = appTabs.length - 1;
  else return;
  event.preventDefault();
  setTab(appTabs[next].dataset.mode);
  appTabs[next].focus();
});

function showError(title, message) {
  $("error-title").textContent = title;
  $("error-message").textContent = message;
  $("error-state").hidden = false;
  $("working-state").hidden = true;
}
function clearError() { $("error-state").hidden = true; }
function readFile(file, maxBytes = MAX_BYTES) {
  if (!file) return Promise.reject(new Error("Choose a file first."));
  if (file.size > maxBytes) return Promise.reject(new Error(`This file is ${humanBytes(file.size)}. The current browser tool is limited to 10 MB per file; try a smaller export.`));
  return file.text();
}
function currentRuleHeaders(parsed, hasHeader) {
  const first = parsed?.rows?.[0] || [];
  return hasHeader ? first : first.map((_, index) => `Column ${index + 1}`);
}

function chooseFile(file) {
  clearError();
  if (!file) return;
  if (file.size > MAX_BYTES) {
    showError("This file is larger than the current limit.", `The selected file is ${humanBytes(file.size)}. Choose a CSV or TSV file up to 10 MB.`);
    return;
  }
  $("working-state").hidden = false;
  $("working-message").textContent = `Reading ${file.name} in your browser…`;
  $("results-area").hidden = true;
  setTimeout(async () => {
    try {
      const text = await readFile(file);
      state.file = file;
      state.rawText = text;
      state.hasHeader = $("has-header").checked;
      state.parsed = parseCSV(text, $("delimiter-select").value);
      state.profile = $("profile-select").value;
      state.rules = makeDefaultRules(currentRuleHeaders(state.parsed, state.hasHeader), state.profile);
      state.exportRows = null;
      state.appliedFixes = null;
      $("working-state").hidden = true;
      $("results-area").hidden = false;
      $("result-file-name").textContent = file.name;
      $("result-file-meta").textContent = `${humanBytes(file.size)} · ${Math.max(0, state.parsed.rows.length - (state.hasHeader ? 1 : 0))} records · ${delimiterName(state.parsed.delimiter)}`;
      const malformedQuotes = state.parsed.syntaxIssues.some((item) => item.severity === "error");
      $("download-csv-button").disabled = malformedQuotes;
      $("apply-fixes-button").disabled = malformedQuotes;
      $("download-csv-button").title = malformedQuotes ? "Export is paused because malformed quotes can make the parsed copy unsafe." : "Download a copy of the file";
      $("profile-caption").textContent = profileCopy[state.profile] || profileCopy.general;
      $("rules-panel").open = false;
      renderRules();
      recompute();
      $("results-area").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      $("working-state").hidden = true;
      showError("We couldn't read that file.", error?.message || "Try a smaller CSV or TSV file saved as UTF-8.");
    }
  }, 30);
}

const dropZone = $("drop-zone");
dropZone.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  $("file-input").click();
});
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("file-input").click(); }
});
$("browse-button").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", (event) => chooseFile(event.target.files?.[0]));
for (const eventName of ["dragenter", "dragover"]) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("is-dragover"); });
for (const eventName of ["dragleave", "drop"]) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragover"); });
dropZone.addEventListener("drop", (event) => chooseFile(event.dataTransfer?.files?.[0]));
$("sample-button").addEventListener("click", () => {
  const file = new File([makeSampleCSV()], "rowready-sample.csv", { type: "text/csv" });
  chooseFile(file);
});
$("profile-select").addEventListener("change", () => {
  $("profile-caption").textContent = profileCopy[$("profile-select").value] || profileCopy.general;
  if (!state.parsed) return;
  state.profile = $("profile-select").value;
  state.rules = makeDefaultRules(currentRuleHeaders(state.parsed, state.hasHeader), state.profile);
  state.exportRows = null;
  state.appliedFixes = null;
  renderRules();
  recompute();
});
function reparseCurrentFile() {
  if (!state.rawText) return;
  state.hasHeader = $("has-header").checked;
  state.parsed = parseCSV(state.rawText, $("delimiter-select").value);
  state.rules = makeDefaultRules(currentRuleHeaders(state.parsed, state.hasHeader), state.profile);
  state.exportRows = null;
  state.appliedFixes = null;
  const malformedQuotes = state.parsed.syntaxIssues.some((item) => item.severity === "error");
  $("download-csv-button").disabled = malformedQuotes;
  $("apply-fixes-button").disabled = malformedQuotes;
  $("download-csv-button").title = malformedQuotes ? "Export is paused because malformed quotes can make the parsed copy unsafe." : "Download a copy of the file";
  $("result-file-meta").textContent = `${humanBytes(state.file?.size || 0)} · ${Math.max(0, state.parsed.rows.length - (state.hasHeader ? 1 : 0))} records · ${delimiterName(state.parsed.delimiter)}`;
  renderRules();
  recompute();
}
$("has-header").addEventListener("change", reparseCurrentFile);
$("delimiter-select").addEventListener("change", reparseCurrentFile);
$("severity-filter").addEventListener("change", renderFindings);
$("new-file-button").addEventListener("click", () => {
  state.file = null; state.rawText = null; state.parsed = null; state.analysis = null; state.exportRows = null; state.appliedFixes = null;
  $("file-input").value = "";
  $("results-area").hidden = true;
  clearError();
  $("workbench-title").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("error-dismiss").addEventListener("click", () => { clearError(); $("file-input").value = ""; });

function recompute() {
  if (!state.parsed) return;
  state.analysis = analyzeCSV(state.parsed, { hasHeader: state.hasHeader, profile: state.profile, rules: state.rules });
  renderSummary();
  renderFindings();
  renderPreview();
  const shopifyIssue = state.analysis.issues.some((item) => item.kind === "shopify-variant-dependency");
  $("shopify-caution").hidden = !(state.profile === "shopify" && shopifyIssue);
  $("findings-description").textContent = state.profile === "shopify"
    ? "Shopify-specific checks are best-effort and based on published CSV guidance; your store settings are not visible here."
    : "Checks are based on the current profile and selected rules.";
  if (state.exportRows) $("fix-status").textContent = "Your checked copy is ready to download.";
}
function renderSummary() {
  const a = state.analysis;
  const metrics = [
    ["Rows", a.stats.rows, ""], ["Columns", a.stats.columns, ""], ["Errors", a.stats.errors, a.stats.errors ? "is-error" : "is-good"], ["Warnings", a.stats.warnings, a.stats.warnings ? "is-warning" : "is-good"]
  ];
  $("report-grid").innerHTML = metrics.map(([label, value, style]) => `<div class="metric-card ${style}"><span>${label}</span><strong>${value.toLocaleString()}</strong></div>`).join("");
  $("finding-count").textContent = a.issues.length.toLocaleString();
}
function issueSymbol(severity) { return severity === "error" ? "!" : severity === "warning" ? "△" : "i"; }
function renderFindings() {
  if (!state.analysis) return;
  const filter = $("severity-filter").value;
  const found = state.analysis.issues.filter((item) => filter === "all" || item.severity === filter);
  if (!found.length) {
    $("findings-list").innerHTML = `<div class="no-findings">${state.analysis.issues.length ? "No findings at this filter level." : "No findings from the selected checks. That is not a guarantee of destination acceptance."}</div>`;
    return;
  }
  $("findings-list").innerHTML = found.slice(0, 120).map((issue) => `<article class="finding finding-${escapeHTML(issue.severity)}"><span class="finding-icon" aria-hidden="true">${issueSymbol(issue.severity)}</span><div><strong>${escapeHTML(issue.message)}</strong><p>${escapeHTML(issue.suggestion || "Review this record.")}</p></div><span class="finding-location">${issue.row ? `Row ${escapeHTML(issue.row)}` : "File"}${issue.column ? ` · ${escapeHTML(issue.column)}` : ""}</span></article>`).join("") + (found.length > 120 ? `<p class="source-note">Showing 120 of ${found.length.toLocaleString()} findings to keep the page responsive. The report export contains the full finding list.</p>` : "");
}
function renderPreview() {
  const a = state.analysis;
  $("preview-head").innerHTML = `<tr>${a.headers.map((header) => `<th scope="col">${escapeHTML(header)}</th>`).join("")}</tr>`;
  const issueCells = new Set(a.issues.filter((item) => item.column && item.row).map((item) => `${item.row}|${item.column}`));
  const rowLines = a.rowLines;
  $("preview-body").innerHTML = a.dataRows.slice(0, 12).map((row, index) => {
    const line = rowLines[index];
    return `<tr>${a.headers.map((header, columnIndex) => {
      const value = row[columnIndex] ?? "";
      const cell = issueCells.has(`${line}|${header}`) ? "issue-cell" : "";
      return `<td class="${cell}" title="${escapeHTML(value)}">${escapeHTML(value) || "—"}</td>`;
    }).join("")}</tr>`;
  }).join("") || `<tr><td colspan="${Math.max(a.headers.length, 1)}">No data rows.</td></tr>`;
}
const RULE_FIELDS = ["type", "required", "unique", "trim", "min", "max", "allowed"];
function renderRules() {
  if (!state.parsed) return;
  const headers = state.hasHeader ? state.parsed.rows[0] || [] : (state.parsed.rows[0] || []).map((_, i) => `Column ${i + 1}`);
  $("rules-body").innerHTML = headers.map((header, index) => {
    const name = String(header ?? "").trim() || `Unnamed column ${index + 1}`;
    const rule = state.rules[name] || { type: "none", required: false, unique: false, trim: false, min: "", max: "", allowed: "" };
    state.rules[name] = rule;
    return `<tr data-col-index="${index}"><td class="rule-name">${escapeHTML(name)}</td><td><select data-rule="type" aria-label="Expected data type for ${escapeHTML(name)}"><option value="none" ${rule.type === "none" ? "selected" : ""}>Don't check</option><option value="text" ${rule.type === "text" ? "selected" : ""}>Text</option><option value="number" ${rule.type === "number" ? "selected" : ""}>Number</option><option value="integer" ${rule.type === "integer" ? "selected" : ""}>Integer</option><option value="email" ${rule.type === "email" ? "selected" : ""}>Email</option><option value="url" ${rule.type === "url" ? "selected" : ""}>URL</option><option value="date" ${rule.type === "date" ? "selected" : ""}>Date</option></select></td><td><input type="checkbox" data-rule="required" aria-label="Require ${escapeHTML(name)}" ${rule.required ? "checked" : ""}></td><td><input type="checkbox" data-rule="unique" aria-label="Check ${escapeHTML(name)} for duplicates" ${rule.unique ? "checked" : ""}></td><td><input type="checkbox" data-rule="trim" aria-label="Trim spaces in ${escapeHTML(name)}" ${rule.trim ? "checked" : ""}></td><td><input type="number" data-rule="min" aria-label="Minimum for ${escapeHTML(name)}" value="${escapeHTML(rule.min)}" step="any"></td><td><input type="number" data-rule="max" aria-label="Maximum for ${escapeHTML(name)}" value="${escapeHTML(rule.max)}" step="any"></td><td><input type="text" data-rule="allowed" aria-label="Allowed values for ${escapeHTML(name)}" value="${escapeHTML(rule.allowed)}" placeholder="one, two, three"></td></tr>`;
  }).join("");
}
$("rules-body").addEventListener("change", (event) => {
  const field = event.target.dataset.rule;
  const row = event.target.closest("tr[data-col-index]");
  if (!field || !row || !state.parsed) return;
  const headers = currentRuleHeaders(state.parsed, state.hasHeader);
  const name = String(headers[Number(row.dataset.colIndex)] ?? "").trim() || `Unnamed column ${Number(row.dataset.colIndex) + 1}`;
  if (!RULE_FIELDS.includes(field)) return;
  state.rules[name] ||= {};
  state.rules[name][field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  state.exportRows = null;
  state.appliedFixes = null;
  recompute();
});

function downloadFile(name, data, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.hidden = true;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function safeBaseName(name) { return String(name || "rowready-file").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "rowready-file"; }
function rowsForExport() {
  if (!state.analysis) return [];
  const rows = state.exportRows || state.analysis.dataRows;
  const header = state.hasHeader ? [state.parsed.rows[0] || []] : [];
  return [...header, ...rows];
}
$("download-csv-button").addEventListener("click", () => {
  if (!state.analysis) return;
  const extension = state.parsed.delimiter === "\t" ? "tsv" : "csv";
  const content = stringifyCSV(rowsForExport(), state.parsed.delimiter, { neutralizeFormulas: true });
  downloadFile(`${safeBaseName(state.file?.name)}-rowready.${extension}`, content, extension === "tsv" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8");
});
$("download-report-button").addEventListener("click", () => {
  if (!state.analysis) return;
  const reviewedRows = state.exportRows || state.analysis.dataRows;
  const rowsForReview = state.hasHeader ? [state.parsed.rows[0] || [], ...reviewedRows] : reviewedRows;
  const reviewParsed = { rows: rowsForReview, rowLines: rowsForReview.map((_, index) => index + 1), syntaxIssues: [], delimiter: state.parsed.delimiter };
  const afterFix = state.exportRows ? analyzeCSV(reviewParsed, { hasHeader: state.hasHeader, profile: state.profile, rules: state.rules }) : state.analysis;
  const report = {
    tool: "RowReady CSV Import Checker",
    generatedAt: new Date().toISOString(),
    fileName: state.file?.name || "local-file",
    fileSize: state.file?.size || null,
    profile: state.profile,
    rows: state.analysis.stats.rows,
    columns: state.analysis.stats.columns,
    delimiter: state.analysis.delimiter === "\t" ? "tab" : state.analysis.delimiter,
    limits: { maxFileSizeBytes: MAX_BYTES, processing: "browser-only", destinationValidation: "not guaranteed" },
    summary: state.analysis.stats,
    appliedFixes: state.appliedFixes || { trimSelectedFields: false, cellsTrimmed: 0, emptyRowsExcluded: 0 },
    findingsTruncated: state.analysis.issues.length >= 20000,
    findings: state.analysis.issues.map(({ severity, kind, row, column, message, suggestion }) => ({ severity, kind, row, column, message, suggestion })),
    unresolvedAfterSelectedFixes: afterFix.issues.map(({ severity, kind, row, column, message, suggestion }) => ({ severity, kind, row, column, message, suggestion }))
  };
  downloadFile(`${safeBaseName(state.file?.name)}-rowready-report.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
});
$("apply-fixes-button").addEventListener("click", () => {
  if (!state.analysis) return;
  state.exportRows = applySafeFixes(state.analysis.dataRows, state.analysis.headers, state.rules, { trim: $("fix-trim").checked, removeEmpty: $("fix-empty-rows").checked });
  const affected = state.analysis.dataRows.length - state.exportRows.length;
  const trimmedCells = $("fix-trim").checked ? state.analysis.dataRows.reduce((count, row) => count + row.reduce((subtotal, value, index) => subtotal + (state.rules[state.analysis.headers[index]]?.trim && String(value ?? "") !== String(value ?? "").trim() ? 1 : 0), 0), 0) : 0;
  state.appliedFixes = { trimSelectedFields: $("fix-trim").checked, cellsTrimmed: trimmedCells, emptyRowsExcluded: $("fix-empty-rows").checked ? affected : 0 };
  $("fix-status").textContent = `Copy ready: ${state.appliedFixes.emptyRowsExcluded} empty row${state.appliedFixes.emptyRowsExcluded === 1 ? "" : "s"} excluded; ${trimmedCells} cell${trimmedCells === 1 ? "" : "s"} trimmed.`;
  $("download-csv-button").focus();
});
for (const id of ["fix-trim", "fix-empty-rows"]) $(id).addEventListener("change", () => {
  if (!state.exportRows) return;
  state.exportRows = null; state.appliedFixes = null;
  $("fix-status").textContent = "Cleanup options changed. Apply them again to prepare a new copy.";
});
$("save-profile-button").addEventListener("click", () => {
  if (!state.analysis) return;
  const payload = { format: "rowready-profile", version: 1, profile: state.profile, columns: state.analysis.headers, rules: state.rules };
  try { localStorage.setItem("rowready-profile-v1", JSON.stringify(payload)); } catch { /* private browsing may deny storage */ }
  downloadFile("rowready-validation-profile.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  $("fix-status").textContent = "Profile downloaded; a local copy was saved when browser storage was available. It contains rules, not file rows.";
});
function applyProfilePayload(payload) {
  if (payload.format !== "rowready-profile" || payload.version !== 1 || !payload.rules || typeof payload.rules !== "object") throw new Error("This is not a RowReady version 1 rule profile.");
  const available = new Set(state.analysis?.headers || []);
  state.rules = Object.fromEntries(Object.entries(payload.rules).filter(([key]) => available.has(key)));
  state.profile = ["general", "shopify", "contacts", "catalog"].includes(payload.profile) ? payload.profile : "general";
  $("profile-select").value = state.profile;
  $("profile-caption").textContent = profileCopy[state.profile] || profileCopy.general;
  state.exportRows = null; state.appliedFixes = null;
  renderRules(); recompute();
}
$("load-local-profile-button").addEventListener("click", () => {
  try {
    const saved = localStorage.getItem("rowready-profile-v1");
    if (!saved) throw new Error("No saved profile was found in this browser. Save one here or import a JSON profile.");
    applyProfilePayload(JSON.parse(saved));
    $("fix-status").textContent = "Saved rules were loaded from this browser. The profile contains rules, not file rows.";
  } catch (error) { $("fix-status").textContent = error.message || "The saved profile could not be read."; }
});
$("load-profile-button").addEventListener("click", () => $("profile-file-input").click());
$("profile-file-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    applyProfilePayload(payload);
    $("fix-status").textContent = "Matching rules from the profile were applied to this file's columns.";
  } catch (error) {
    showError("This profile could not be loaded.", error.message || "Choose a RowReady JSON rule profile.");
  } finally { event.target.value = ""; }
});

function parseCompareFile(file) {
  return readFile(file).then((text) => {
    const parsed = parseCSV(text, "auto");
    if (parsed.syntaxIssues.some((item) => item.severity === "error")) throw new Error(`There are quoting issues in ${file.name}. Fix the CSV structure before comparing.`);
    if (parsed.rows.length < 2) throw new Error(`${file.name} needs a header row and at least one data row.`);
    const headers = parsed.rows[0].map((name, index) => String(name ?? "").trim() || `Unnamed column ${index + 1}`);
    const malformedRow = parsed.rows.slice(1).findIndex((row) => row.length !== headers.length);
    if (malformedRow >= 0) throw new Error(`${file.name} contains a row with a different number of fields than its header (file row ${malformedRow + 2}). Fix the structure before comparing.`);
    return { file, parsed, headers, rows: parsed.rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim() !== "")) };
  });
}
function fillKeySelectors() {
  const ready = state.baseline && state.incoming;
  for (const id of ["baseline-key", "incoming-key"]) $(id).disabled = !ready;
  $("run-compare-button").disabled = !ready;
  if (!ready) return;
  const makeOptions = (headers, selected) => headers.map((header, index) => `<option value="${index}" ${index === selected ? "selected" : ""}>${escapeHTML(header)}</option>`).join("");
  const baselineDefault = Math.max(0, state.baseline.headers.findIndex((header) => /sku|id|email|handle|key/i.test(header)));
  const matchHeader = state.baseline.headers[baselineDefault];
  const incomingDefault = Math.max(0, state.incoming.headers.findIndex((header) => header.trim().toLowerCase() === matchHeader.trim().toLowerCase()));
  $("baseline-key").innerHTML = makeOptions(state.baseline.headers, baselineDefault);
  $("incoming-key").innerHTML = makeOptions(state.incoming.headers, incomingDefault);
}
$("baseline-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  state.comparison = null; $("compare-results").hidden = true;
  $("compare-error").hidden = true;
  $("baseline-name").textContent = `Reading ${file.name}…`;
  try { state.baseline = await parseCompareFile(file); $("baseline-name").textContent = `${file.name} · ${state.baseline.rows.length.toLocaleString()} records`; }
  catch (error) { state.baseline = null; $("baseline-name").textContent = "Choose the trusted earlier CSV"; showCompareError("Baseline file could not be prepared.", error.message); }
  fillKeySelectors();
});
$("incoming-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  state.comparison = null; $("compare-results").hidden = true;
  $("compare-error").hidden = true;
  $("incoming-name").textContent = `Reading ${file.name}…`;
  try { state.incoming = await parseCompareFile(file); $("incoming-name").textContent = `${file.name} · ${state.incoming.rows.length.toLocaleString()} records`; }
  catch (error) { state.incoming = null; $("incoming-name").textContent = "Choose the newer CSV to review"; showCompareError("Incoming file could not be prepared.", error.message); }
  fillKeySelectors();
});

function compareFiles() {
  if (!state.baseline || !state.incoming) return;
  $("compare-error").hidden = true;
  try {
    const bKeyIndex = Number($("baseline-key").value);
    const nKeyIndex = Number($("incoming-key").value);
    state.comparison = compareCSVData(state.baseline, state.incoming, bKeyIndex, nKeyIndex);
    renderComparison();
  } catch (error) {
    state.comparison = null;
    showCompareError("Files could not be compared.", error?.message || "Review the selected key columns and file structure.");
  }
}
function showCompareError(title, message) {
  $("compare-error-title").textContent = title;
  $("compare-error-message").textContent = message || "Choose another CSV or TSV file up to 10 MB.";
  $("compare-error").hidden = false;
}
$("run-compare-button").addEventListener("click", compareFiles);
function renderComparison() {
  const c = state.comparison;
  if (!c) return;
  $("compare-results").hidden = false;
  $("compare-summary").innerHTML = [["New records", c.added.length], ["Missing from new file", c.removed.length], ["Changed records", c.changedRecords], ["Repeated or blank keys", c.duplicateKeys.length]].map(([label, count]) => `<div class="compare-pill"><strong>${count.toLocaleString()}</strong><span>${escapeHTML(label)}</span></div>`).join("");
  const items = [
    ...c.added.map((item) => ({ status: "New record", ...item, column: "—", before: "", after: "" })),
    ...c.removed.map((item) => ({ status: "Missing from incoming file", ...item, column: "—", before: "", after: "" })),
    ...c.changes.map((item) => ({ status: "Changed value", ...item })),
    ...c.addedHeaders.map((column) => ({ status: "New column", key: "—", column, before: "", after: "" })),
    ...c.removedHeaders.map((column) => ({ status: "Removed column", key: "—", column, before: "", after: "" })),
    ...c.duplicateKeys.map((item) => ({ status: item.reason === "blank key" ? `Blank key in ${item.side}` : `Repeated key in ${item.side}`, key: item.key || "(blank)", column: item.row ? `Row ${item.row}` : "—", before: "", after: "" }))
  ];
  if (!items.length) $("diff-list").innerHTML = `<div class="no-findings">No differences found for the selected key and common columns.</div>`;
  else $("diff-list").innerHTML = items.slice(0, 100).map((item) => `<article class="finding"><span class="finding-icon" aria-hidden="true">${item.status.startsWith("Changed") ? "↔" : item.status.startsWith("New") ? "+" : "!"}</span><div><strong>${escapeHTML(item.status)} · ${escapeHTML(item.key || "(blank)")}</strong><p>${escapeHTML(item.column || "—")}${item.status === "Changed value" ? `: “${escapeHTML(item.before)}” → “${escapeHTML(item.after)}”` : ""}</p></div><span class="finding-location">${item.status.startsWith("Changed") ? "Review" : "Check"}</span></article>`).join("") + (items.length > 100 ? `<p class="source-note">Showing 100 of ${items.length.toLocaleString()} change rows. The downloaded report contains the full differences.</p>` : "");
}
$("download-diff-button").addEventListener("click", () => {
  if (!state.comparison) return;
  const c = state.comparison;
  const rows = [["status", "key", "column", "before", "after"], ...c.added.map((x) => ["new", x.key, "", "", ""]), ...c.removed.map((x) => ["missing from incoming", x.key, "", "", ""]), ...c.changes.map((x) => ["changed", x.key, x.column, x.before, x.after]), ...c.addedHeaders.map((column) => ["new column", "", column, "", ""]), ...c.removedHeaders.map((column) => ["removed column", "", column, "", ""]), ...c.duplicateKeys.map((x) => [x.reason, x.key, x.side, "", ""])];
  downloadFile("rowready-change-review.csv", stringifyCSV(rows, ",", { neutralizeFormulas: true }), "text/csv;charset=utf-8");
});

// Compare uploads are local too; keep the privacy boundary visible if a file read fails.
$("baseline-input").setAttribute("aria-label", "Choose baseline CSV file");
$("incoming-input").setAttribute("aria-label", "Choose incoming CSV file");
