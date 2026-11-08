const CANDIDATES = [",", "\t", ";", "|"];

export function detectDelimiter(text) {
  const sample = String(text || "").slice(0, 16000).replace(/^\uFEFF/, "");
  let best = ",";
  let bestScore = -Infinity;
  for (const delimiter of CANDIDATES) {
    const widths = [];
    let width = 1;
    let quoted = false;
    for (let i = 0; i < sample.length; i += 1) {
      const ch = sample[i];
      if (ch === '"') {
        if (quoted && sample[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && ch === delimiter) {
        width += 1;
      } else if (!quoted && (ch === "\n" || ch === "\r")) {
        if (width > 1 || widths.length < 3) widths.push(width);
        width = 1;
        if (ch === "\r" && sample[i + 1] === "\n") i += 1;
        if (widths.length >= 12) break;
      }
    }
    if (width > 1 && widths.length < 12) widths.push(width);
    const meaningful = widths.filter((n) => n > 1);
    if (!meaningful.length) continue;
    const mean = meaningful.reduce((sum, n) => sum + n, 0) / meaningful.length;
    const variance = meaningful.reduce((sum, n) => sum + ((n - mean) ** 2), 0) / meaningful.length;
    const score = mean - Math.sqrt(variance) * 0.65 + Math.min(meaningful.length, 8) * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

export function parseCSV(input, delimiter = "auto") {
  let text = String(input ?? "").replace(/^\uFEFF/, "");
  const sep = delimiter === "auto" ? detectDelimiter(text) : delimiter;
  const rows = [];
  const rowLines = [];
  const syntaxIssues = [];
  let row = [];
  let field = "";
  let quoted = false;
  let quoteClosed = false;
  let line = 1;
  let rowStartLine = 1;
  let sawAny = false;

  const pushField = () => {
    row.push(field);
    field = "";
    quoteClosed = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    rowLines.push(rowStartLine);
    row = [];
    rowStartLine = line + 1;
    sawAny = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    sawAny = true;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += ch;
        if (ch === "\n") line += 1;
        else if (ch === "\r" && text[i + 1] !== "\n") line += 1;
      }
      continue;
    }

    if (ch === sep) {
      pushField();
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      pushRow();
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      line += 1;
      rowStartLine = line;
      continue;
    }
    if (ch === '"') {
      if (field.length === 0 && !quoteClosed) {
        quoted = true;
      } else {
        syntaxIssues.push({ severity: "error", kind: "quote", row: line, column: "", message: "A quote appears inside an unquoted field.", suggestion: "Check whether the value should be quoted and any quote characters escaped as doubled quotes." });
        field += ch;
      }
      continue;
    }
    if (quoteClosed) {
      if (!/\s/.test(ch)) {
        syntaxIssues.push({ severity: "error", kind: "quote", row: line, column: "", message: "Unexpected text follows a closing quote.", suggestion: "Move the delimiter after the closing quote, or check the source field's quoting." });
      }
      field += ch;
      continue;
    }
    field += ch;
  }

  if (quoted) {
    syntaxIssues.push({ severity: "error", kind: "quote", row: rowStartLine, column: "", message: "A quoted field was never closed.", suggestion: "Close the quote or escape an internal quote by doubling it, then check the rows after this point." });
  }
  if (sawAny || row.length || field.length || quoteClosed) pushRow();
  return { rows, rowLines, delimiter: sep, syntaxIssues, lineCount: line };
}

const normalizeHeader = (value) => String(value ?? "").trim().toLocaleLowerCase();
const blank = (value) => String(value ?? "").trim() === "";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const urlRe = /^(https?:\/\/)[^\s.]+(?:\.[^\s.]+)+(?:[/:?#][^\s]*)?$/i;

function validDate(value) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return !Number.isNaN(Date.parse(value));
  const year = Number(iso[1]); const month = Number(iso[2]); const day = Number(iso[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizedNumber(value) {
  const v = String(value ?? "").trim();
  const numericPattern = /^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (!numericPattern.test(v)) return Number.NaN;
  return Number(v.replace(/,/g, ""));
}

function typeValid(value, type) {
  const v = String(value ?? "").trim();
  if (v === "") return true;
  switch (type) {
    case "text": return true;
    case "number": return Number.isFinite(normalizedNumber(v));
    case "integer": return /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(v);
    case "email": return emailRe.test(v);
    case "url": return urlRe.test(v);
    case "date": return validDate(v);
    default: return true;
  }
}

function addIssue(issues, issue) {
  if (issues.length < 20000) issues.push(issue);
}

export function analyzeCSV(parsed, { hasHeader = true, profile = "general", rules = {} } = {}) {
  const issues = [...parsed.syntaxIssues];
  const matrix = parsed.rows;
  if (!matrix.length) {
    return { headers: [], dataRows: [], rowLines: [], issues: [{ severity: "error", kind: "empty-file", row: 1, column: "", message: "This file has no readable rows.", suggestion: "Choose a non-empty CSV or TSV file." }], stats: { rows: 0, columns: 0, emptyRows: 0, duplicateRows: 0, errors: 1, warnings: 0 }, profile };
  }

  const rawHeaders = hasHeader ? matrix[0] : matrix[0].map((_, i) => `Column ${i + 1}`);
  const headers = rawHeaders.map((name, i) => String(name ?? "").trim() || (hasHeader ? `Unnamed column ${i + 1}` : name));
  const headerRow = hasHeader ? matrix[0] : null;
  const startIndex = hasHeader ? 1 : 0;
  const dataRows = matrix.slice(startIndex);
  const rowLines = parsed.rowLines.slice(startIndex);

  if (hasHeader) {
    const seen = new Map();
    rawHeaders.forEach((header, i) => {
      const key = normalizeHeader(header);
      const lineNo = parsed.rowLines[0] || 1;
      if (!key) addIssue(issues, { severity: "error", kind: "blank-header", row: lineNo, column: `Column ${i + 1}`, message: `Header ${i + 1} is blank.`, suggestion: "Add a meaningful column name or remove the empty column." });
      else if (seen.has(key)) addIssue(issues, { severity: "error", kind: "duplicate-header", row: lineNo, column: headers[i], message: `The header “${headers[i]}” is repeated.`, suggestion: "Rename the duplicate header so the destination can distinguish these fields." });
      else seen.set(key, i);
    });
  }

  const headerWidth = headers.length;
  dataRows.forEach((cells, i) => {
    const lineNo = rowLines[i] || i + startIndex + 1;
    if (cells.every((cell) => blank(cell))) {
      addIssue(issues, { severity: "warning", kind: "empty-row", row: lineNo, column: "", message: "This record is completely empty.", suggestion: "Review it; you can exclude blank rows from the downloaded copy." });
    } else if (cells.length !== headerWidth) {
      const short = cells.length < headerWidth;
      addIssue(issues, { severity: "error", kind: "field-count", row: lineNo, column: "", message: `This row has ${cells.length} fields; the header has ${headerWidth}.`, suggestion: short ? "Check for a missing delimiter or a truncated value." : "Check for an unescaped delimiter inside a value." });
    }
  });

  const seenRows = new Map();
  dataRows.forEach((cells, i) => {
    if (cells.every((cell) => blank(cell))) return;
    const key = JSON.stringify(cells);
    const lineNo = rowLines[i] || i + startIndex + 1;
    if (seenRows.has(key)) addIssue(issues, { severity: "warning", kind: "duplicate-row", row: lineNo, column: "", message: `This row duplicates row ${seenRows.get(key)} exactly.`, suggestion: "Compare both records before deciding whether one can be removed." });
    else seenRows.set(key, lineNo);
  });

  if (/\uFFFD|(?:Ã.|Â.|â€™|â€œ|â€|ï»¿)/.test(matrix.flat().join(" "))) {
    addIssue(issues, { severity: "warning", kind: "encoding", row: 1, column: "", message: "Some text may have been read with the wrong character encoding.", suggestion: "Check accented or unusual characters and try re-saving the source as UTF-8." });
  }

  const headerMap = new Map(headers.map((name, i) => [normalizeHeader(name), i]));
  const effectiveRules = {};
  headers.forEach((name, i) => {
    const saved = rules[name] || {};
    effectiveRules[name] = { type: saved.type || "none", required: Boolean(saved.required), unique: Boolean(saved.unique), trim: Boolean(saved.trim), min: saved.min ?? "", max: saved.max ?? "", allowed: saved.allowed || "" };
    const rule = effectiveRules[name];
    const valuesSeen = new Map();
    dataRows.forEach((cells, rowIndex) => {
      const value = String(cells[i] ?? "");
      const lineNo = rowLines[rowIndex] || rowIndex + startIndex + 1;
      if (rule.required && blank(value)) addIssue(issues, { severity: "error", kind: "required", row: lineNo, column: name, message: `Required value is missing in “${name}”.`, suggestion: "Add a value or decide whether this field should be required for this file." });
      if (rule.trim && value !== value.trim() && !blank(value)) addIssue(issues, { severity: "warning", kind: "whitespace", row: lineNo, column: name, message: `“${name}” has leading or trailing spaces.`, suggestion: "Preview a trim before exporting; check that spaces are not meaningful in this field." });
      if (rule.type !== "none" && !blank(value) && !typeValid(value, rule.type)) addIssue(issues, { severity: "error", kind: "type", row: lineNo, column: name, message: `Value in “${name}” does not match the selected ${rule.type} format.`, suggestion: "Review the value and the chosen rule; date formats can vary by locale." });
      const numberValue = normalizedNumber(value);
      if (!blank(value) && rule.min !== "" && Number.isFinite(numberValue) && numberValue < Number(rule.min)) addIssue(issues, { severity: "warning", kind: "range", row: lineNo, column: name, message: `Value in “${name}” is below the chosen minimum (${rule.min}).`, suggestion: "Check this range against the destination's own rules." });
      if (!blank(value) && rule.max !== "" && Number.isFinite(numberValue) && numberValue > Number(rule.max)) addIssue(issues, { severity: "warning", kind: "range", row: lineNo, column: name, message: `Value in “${name}” is above the chosen maximum (${rule.max}).`, suggestion: "Check this range against the destination's own rules." });
      if (!blank(value) && rule.allowed.trim()) {
        const allowed = rule.allowed.split(",").map((item) => item.trim()).filter(Boolean);
        if (!allowed.includes(value.trim())) addIssue(issues, { severity: "warning", kind: "allowed", row: lineNo, column: name, message: `Value in “${name}” is not in the selected allowed-values list.`, suggestion: `Expected one of: ${allowed.slice(0, 8).join(", ")}${allowed.length > 8 ? ", …" : ""}.` });
      }
      if (rule.unique && !blank(value)) {
        const key = value.trim().toLocaleLowerCase();
        if (valuesSeen.has(key)) addIssue(issues, { severity: "warning", kind: "unique", row: lineNo, column: name, message: `“${name}” repeats a value from row ${valuesSeen.get(key)}.`, suggestion: "Review the matching records; some systems update existing records instead of creating new ones." });
        else valuesSeen.set(key, lineNo);
      }
    });
  });

  if (profile === "shopify") {
    const handleIndex = headerMap.get("url handle") ?? headerMap.get("handle");
    const titleIndex = headerMap.get("title");
    if (handleIndex === undefined) addIssue(issues, { severity: "error", kind: "shopify-header", row: 1, column: "URL handle", message: "The Shopify product update profile did not find a “URL handle” (or legacy “Handle”) column.", suggestion: "For updates, include URL handle and Title. Shopify also accepts the legacy Handle heading." });
    if (titleIndex === undefined) addIssue(issues, { severity: "error", kind: "shopify-header", row: 1, column: "Title", message: "The Shopify product update profile did not find a “Title” column.", suggestion: "Include the Title column from Shopify's product CSV template." });
    if (handleIndex !== undefined) {
      dataRows.forEach((cells, i) => {
        const handle = String(cells[handleIndex] ?? "").trim();
        if (handle && /\s/.test(handle)) addIssue(issues, { severity: "warning", kind: "shopify-handle", row: rowLines[i] || i + startIndex + 1, column: headers[handleIndex], message: "This URL handle contains whitespace.", suggestion: "Shopify's current CSV guidance says a valid handle can use letters, dashes and numbers, but not spaces. Verify it against your current template." });
      });
    }
    const option1Name = headerMap.has("option1 name");
    const option1Value = headerMap.has("option1 value");
    const variantFieldPresent = headers.some((name) => /^(sku|price|weight value \(grams\)|barcodes?|variant\s+(sku|price|grams|weight|barcodes?))$/i.test(name.trim()));
    if (variantFieldPresent && (!option1Name || !option1Value)) {
      addIssue(issues, { severity: "warning", kind: "shopify-variant-dependency", row: 1, column: "Option1 name / Option1 value", message: "Variant-related fields are present, but one or both Option1 columns are missing.", suggestion: "Shopify documents a dependency between variant fields and option columns. Check the current Shopify CSV guide before updating; omitting option fields in some updates can create a default variant and delete existing variants." });
    }
  }

  const emptyRows = dataRows.filter((cells) => cells.every((cell) => blank(cell))).length;
  const duplicateRows = issues.filter((item) => item.kind === "duplicate-row").length;
  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;
  return { headers, dataRows, rowLines, issues, effectiveRules, profile, delimiter: parsed.delimiter, stats: { rows: dataRows.length, columns: headers.length, emptyRows, duplicateRows, errors, warnings } };
}

export function applySafeFixes(rows, headers, rules, { trim = false, removeEmpty = false } = {}) {
  return rows
    .filter((cells) => !(removeEmpty && cells.every((cell) => blank(cell))))
    .map((cells) => cells.map((cell, i) => trim && rules[headers[i]]?.trim ? String(cell ?? "").trim() : String(cell ?? "")));
}

export function stringifyCSV(rows, delimiter = ",", { neutralizeFormulas = false } = {}) {
  return rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    // Prefix spreadsheet formula-like cells in exported files; this changes only the downloaded copy.
    if (neutralizeFormulas && /^[\u0000-\u0020]*[=+\-@]/.test(text)) text = "'" + text;
    return text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter)
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  }).join(delimiter)).join("\r\n");
}

export function makeDefaultRules(headers, profile = "general") {
  const rules = {};
  headers.forEach((header) => { rules[header] = { type: "none", required: false, unique: false, trim: false, min: "", max: "", allowed: "" }; });
  const find = (pattern) => headers.find((header) => pattern.test(header));
  if (profile === "contacts") {
    const email = find(/email/i);
    if (email) rules[email] = { ...rules[email], type: "email", unique: true, trim: true };
  }
  if (profile === "catalog") {
    const sku = find(/\bsku\b/i);
    const price = find(/price/i);
    if (sku) rules[sku] = { ...rules[sku], type: "text", trim: true, unique: true };
    if (price) rules[price] = { ...rules[price], type: "number", min: "0", trim: true };
  }
  if (profile === "shopify") {
    const handle = find(/^(url handle|handle)$/i);
    const title = find(/^title$/i);
    if (handle) rules[handle] = { ...rules[handle], type: "text", trim: true };
    if (title) rules[title] = { ...rules[title], type: "text", trim: true };
    const sku = find(/^(sku|variant\s+sku)$/i);
    if (sku) rules[sku] = { ...rules[sku], type: "text", trim: true };
    const price = find(/^(price|variant\s+price)$/i);
    if (price) rules[price] = { ...rules[price], type: "number", min: "0", trim: true };
  }
  return rules;
}

export function makeSampleCSV() {
  return 'email,order_total,created_at,sku\nava@example.com,42.50,2026-05-01,SKU-001\nava@example.com,not-a-number,2026-05-02, SKU-002 \nmissing-at-sign,18.00,31/14/2026,SKU-002\nben@example.com,0,2026-05-04,SKU-004\n,,,\n';
}
