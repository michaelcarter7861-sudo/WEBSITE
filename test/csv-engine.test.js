import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeCSV,
  applySafeFixes,
  makeDefaultRules,
  parseCSV,
  stringifyCSV
} from "../assets/csv-engine.js";

test("parses quoted delimiters, escaped quotes, and embedded CRLF newlines", () => {
  const parsed = parseCSV('name,note\r\nA,"hello, world"\r\nB,"line 1\r\nline 2"\r\nC,"say ""hi"""');
  assert.deepEqual(parsed.rows, [
    ["name", "note"],
    ["A", "hello, world"],
    ["B", "line 1\r\nline 2"],
    ["C", 'say "hi"']
  ]);
  assert.deepEqual(parsed.rowLines, [1, 2, 3, 5]);
  assert.deepEqual(parsed.syntaxIssues, []);
});

test("removes a UTF-8 BOM and detects common alternate delimiters", () => {
  assert.deepEqual(parseCSV("\uFEFFa;b\n1;2", "auto").rows, [["a", "b"], ["1", "2"]]);
  assert.equal(parseCSV("a\tb\n1\t2", "auto").delimiter, "\t");
  assert.equal(parseCSV("a|b\n1|2", "auto").delimiter, "|");
});

test("reports unclosed quotes and rejects unsafe assumptions without losing the issue", () => {
  const parsed = parseCSV('id,note\n1,"not closed');
  assert.ok(parsed.syntaxIssues.some((issue) => issue.kind === "quote" && issue.severity === "error"));
  const analysis = analyzeCSV(parsed);
  assert.equal(analysis.issues[0].kind, "quote");
});

test("flags inconsistent row widths, blank records, and repeated records", () => {
  const analysis = analyzeCSV(parseCSV("id,name\n1,Ada\n2\n1,Ada\n,\n"));
  assert.ok(analysis.issues.some((issue) => issue.kind === "field-count" && issue.row === 3));
  assert.ok(analysis.issues.some((issue) => issue.kind === "duplicate-row" && issue.row === 4));
  assert.ok(analysis.issues.some((issue) => issue.kind === "empty-row"));
});

test("flags repeated headers without merging their columns", () => {
  const analysis = analyzeCSV(parseCSV("id,ID\n1,2"));
  assert.equal(analysis.headers.length, 2);
  assert.ok(analysis.issues.some((issue) => issue.kind === "duplicate-header"));
});

test("validates user-selected types, uniqueness, and strict ISO calendar dates", () => {
  const rules = {
    email: { type: "email", unique: true },
    date: { type: "date" }
  };
  const analysis = analyzeCSV(parseCSV("email,date\na@example.com,2026-02-28\na@example.com,2026-02-30\nnot-an-email,2026-01-01"), { rules });
  assert.ok(analysis.issues.some((issue) => issue.kind === "unique"));
  assert.ok(analysis.issues.some((issue) => issue.kind === "type" && issue.column === "date"));
  assert.ok(analysis.issues.some((issue) => issue.kind === "type" && issue.column === "email"));
});

test("numeric validation rejects malformed comma grouping but accepts valid grouped values", () => {
  const analysis = analyzeCSV(
    parseCSV('amount,whole\\n"1,234.50","1,234"\\n"1,2","1,2"\\n"12,34.5","12,34"'),
    { hasHeader: true, rules: { amount: { type: "number" }, whole: { type: "integer" } } }
  );
  const invalidAmountRows = analysis.issues.filter((issue) => issue.kind === "type" && issue.column === "amount").map((issue) => issue.row);
  const invalidIntegerRows = analysis.issues.filter((issue) => issue.kind === "type" && issue.column === "whole").map((issue) => issue.row);
  assert.deepEqual(invalidAmountRows, [3, 4]);
  assert.deepEqual(invalidIntegerRows, [3, 4]);
});

test("CSV export can neutralize spreadsheet formula-like cells without changing default serialization", () => {
  const rows = [["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "ordinary"]];
  assert.equal(stringifyCSV(rows), '=1+1,+SUM(A1:A2),-2+3,@cmd,ordinary');
  assert.equal(stringifyCSV(rows, ",", { neutralizeFormulas: true }), "'=1+1,'+SUM(A1:A2),'-2+3,'@cmd,ordinary");
});

test("Shopify profile surfaces the documented option-column dependency", () => {
  const analysis = analyzeCSV(parseCSV("URL handle,Title,Variant SKU\nitem,Thing,sku-1"), { profile: "shopify" });
  assert.ok(analysis.issues.some((issue) => issue.kind === "shopify-variant-dependency"));
});

test("default contact and catalog profiles create relevant column rules", () => {
  const contacts = makeDefaultRules(["Name", "Email"], "contacts");
  assert.equal(contacts.Email.type, "email");
  assert.equal(contacts.Email.unique, true);
  const catalog = makeDefaultRules(["SKU", "Price"], "catalog");
  assert.equal(catalog.SKU.unique, true);
  assert.equal(catalog.Price.type, "number");
});

test("safe fixes only trim selected columns and optionally remove blank records", () => {
  const result = applySafeFixes(
    [["  A-1  ", "  note  "], ["", "  "]],
    ["SKU", "Note"],
    { SKU: { trim: true }, Note: { trim: false } },
    { trim: true, removeEmpty: true }
  );
  assert.deepEqual(result, [["A-1", "  note  "]]);
});

test("serialized CSV round-trips quotes, commas, line breaks, tabs and empty cells", () => {
  const rows = [["a", "b", "c"], ["comma,value", 'quote " value', "line 1\nline 2"], ["", "tab\tvalue", ""]];
  const result = parseCSV(stringifyCSV(rows));
  assert.deepEqual(result.rows, rows);
  assert.deepEqual(result.syntaxIssues, []);
});
