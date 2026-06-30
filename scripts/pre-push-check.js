#!/usr/bin/env node
/**
 * iValeter pre-push safety checker
 * Catches common TypeScript strict-mode issues before they reach Railway.
 *
 * Run: node scripts/pre-push-check.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let errors = [];
let warnings = [];
let filesChecked = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function walk(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

function check(file) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  filesChecked++;

  lines.forEach((line, i) => {
    const ln = i + 1;

    // ── Double commas (syntax error) ─────────────────────────────────────────
    if (/\}\s*\)\s*,\s*,$/.test(line)) {
      errors.push(`${rel}:${ln} — Double comma: ${line.trim()}`);
    }

    // ── .split(":").map(Number) without index safety ──────────────────────────
    if (/\.split\(['"]:?['"]\)\.map\(Number\)/.test(line)) {
      // Only flag if it's destructured directly without defaults
      if (/const\s*\[/.test(line) && !/=\s*["'\d]/.test(line.split("=").slice(1).join("="))) {
        errors.push(
          `${rel}:${ln} — Unsafe split().map(Number) destructure — use index access with ?? 0 fallback: ${line.trim()}`
        );
      }
    }

    // ── .split(":") destructure without defaults ──────────────────────────────
    if (/const\s*\[.*\]\s*=\s*\S+\.split\(/.test(line)) {
      // OK if all destructured vars have defaults e.g. [a = "0", b = "0"]
      const destructure = line.match(/const\s*\[(.*?)\]\s*=/)?.[1] ?? "";
      const vars = destructure.split(",").map((v) => v.trim());
      const missingDefault = vars.some((v) => v && !v.includes("="));
      if (missingDefault) {
        // OK if the very next line is a null-guard (if (!a || !b)) throw
        const nextLine = lines[i + 1]?.trim() ?? "";
        const hasNullGuard = /^if\s*\(!/.test(nextLine) || /throw/.test(nextLine);
        if (!hasNullGuard) {
          errors.push(
            `${rel}:${ln} — Destructured split without defaults — add = "0" fallbacks or null-guard on next line: ${line.trim()}`
          );
        }
      }
    }

    // ── Array index access spread into typed object ───────────────────────────
    // e.g. { ...s[id], someField: value } where s[id] may be undefined
    if (/\{\s*\.\.\.[a-zA-Z_$]+\[[^\]]+\]/.test(line)) {
      errors.push(
        `${rel}:${ln} — Spreading potentially-undefined index access — guard with 'if (!s[id]) return s' first: ${line.trim()}`
      );
    }

    // ── keepPreviousData (removed in TanStack Query v5) ──────────────────────
    if (/keepPreviousData/.test(line)) {
      errors.push(`${rel}:${ln} — 'keepPreviousData' removed in TanStack Query v5 — remove it: ${line.trim()}`);
    }

    // ── Lucide icon title prop (not a valid LucideProps field) ───────────────
    // Only flag actual Lucide icon components — extract imported names from the file's lucide import
    if (/from "lucide-react"/.test(src)) {
      // Extract all named imports from lucide-react in this file
      const lucideImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*"lucide-react"/);
      if (lucideImportMatch) {
        const lucideNames = lucideImportMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim());
        const lucideSet = new Set(lucideNames);
        // Check if this line uses a known Lucide icon with a title prop
        const iconUsageMatch = line.match(/<([A-Z][a-zA-Z0-9]+)/);
        if (iconUsageMatch && lucideSet.has(iconUsageMatch[1]) && /\btitle="/.test(line)) {
          errors.push(`${rel}:${ln} — Lucide icons don't accept 'title' prop — use aria-label instead: ${line.trim()}`);
        }
      }
    }

    // ── React Query / tRPC options that don't exist ───────────────────────────
    if (/initialData\s*:/.test(line) && /useQuery/.test(src.slice(0, src.indexOf(line)))) {
      // initialData is fine — skip
    }

    // ── Missing required props — basic heuristic: JSX spread without explicit required field ──
    // (too complex to fully check here — covered by tsc)

    // ── Property access on possibly-undefined array element ──────────────────
    // e.g. ARRAY[idx].something without a nullish guard
    if (/[A-Z_]+\[(?:idx|index|i|periodIdx|siteIdx)\]\./.test(line) && !/\?\s*\./.test(line)) {
      warnings.push(
        `${rel}:${ln} — Possible undefined array index access without optional chaining: ${line.trim()}`
      );
    }
  });
}

// ─── Also check for schema/router mismatches ─────────────────────────────────

function checkRouterShapes() {
  // Scan for type annotations in client components that manually type query results
  // These are the most common source of shape mismatches
  const clientFiles = [
    ...walk(path.join(ROOT, "apps/web/components")),
  ];

  for (const file of clientFiles) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split("\n");

    lines.forEach((line, i) => {
      const ln = i + 1;
      // Inline type annotations on .map() callbacks are a red flag — shape may drift from router
      if (/\.map\(\s*\([a-z]+\s*:\s*\{[^}]{20,}\}/.test(line)) {
        warnings.push(
          `${rel}:${ln} — Inline type annotation on .map() callback — verify shape matches router return type: ${line.trim().slice(0, 80)}…`
        );
      }
    });
  }
}

// ─── Run checks ──────────────────────────────────────────────────────────────

const SCAN_DIRS = [
  path.join(ROOT, "apps/web/app"),
  path.join(ROOT, "apps/web/components"),
  path.join(ROOT, "packages/api/src"),
];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    check(file);
  }
}

checkRouterShapes();

// ─── Report ───────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const RED   = "\x1b[31m";
const AMBER = "\x1b[33m";
const GREEN = "\x1b[32m";
const BOLD  = "\x1b[1m";

console.log(`\n${BOLD}iValeter Pre-Push Check${RESET}`);
console.log(`Scanned ${filesChecked} files\n`);

if (errors.length > 0) {
  console.log(`${RED}${BOLD}✖ ${errors.length} error${errors.length > 1 ? "s" : ""} found — fix before pushing:${RESET}\n`);
  errors.forEach((e) => console.log(`  ${RED}✖${RESET} ${e}`));
}

if (warnings.length > 0) {
  console.log(`\n${AMBER}${BOLD}⚠ ${warnings.length} warning${warnings.length > 1 ? "s" : ""} — review before pushing:${RESET}\n`);
  warnings.forEach((w) => console.log(`  ${AMBER}⚠${RESET} ${w}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log(`${GREEN}${BOLD}✔ All checks passed — safe to push${RESET}\n`);
} else if (errors.length === 0) {
  console.log(`\n${GREEN}✔ No blocking errors — warnings above are advisory${RESET}\n`);
}

process.exit(errors.length > 0 ? 1 : 0);
