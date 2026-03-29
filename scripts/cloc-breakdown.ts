#!/usr/bin/env -S node --experimental-strip-types
/**
 * Code line counter with category breakdown for TypeScript/JavaScript files.
 *
 * Runs `cloc --vcs=git --json --by-file` and classifies TS/JS files into
 * three categories: Application, Test, and Scripts. Produces a cloc-style
 * ASCII table with sub-category rows beneath each TS/JS language total.
 *
 * Usage:
 *   pnpm run cloc
 */
import { execSync } from "node:child_process";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClocEntry {
    nFiles: number;
    blank: number;
    comment: number;
    code: number;
    language?: string;
}

interface ClocByFileOutput {
    header: { cloc_url: string; cloc_version: string; n_files: number; n_lines: number };
    SUM: ClocEntry;
    [filePath: string]: ClocEntry | ClocByFileOutput["header"] | ClocEntry;
}

interface Counts {
    files: number;
    blank: number;
    comment: number;
    code: number;
}

type Category = "Application" | "Test" | "Scripts";

// Languages whose files get sub-categorized
const CATEGORIZED_LANGUAGES = new Set(["TypeScript", "JavaScript"]);

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyFile(filePath: string): Category {
    const basename = path.basename(filePath);

    // Test code: .test.*, .spec.*, test-helper files, spec-validation, __tests__
    if (
        basename.includes(".test.") ||
        basename.includes(".spec.") ||
        basename.includes("test-helper") ||
        filePath.includes("/spec-validation/") ||
        filePath.includes("/__tests__/")
    ) {
        return "Test";
    }

    // Scripts: anything under ./scripts/
    if (filePath.startsWith("./scripts/") || filePath.startsWith("scripts/")) {
        return "Scripts";
    }

    return "Application";
}

// ---------------------------------------------------------------------------
// Data aggregation
// ---------------------------------------------------------------------------

function emptyCounts(): Counts {
    return { files: 0, blank: 0, comment: 0, code: 0 };
}

function addCounts(target: Counts, entry: ClocEntry): void {
    target.files += 1;
    target.blank += entry.blank;
    target.comment += entry.comment;
    target.code += entry.code;
}

function runCloc(): ClocByFileOutput {
    const stdout = execSync("cloc --vcs=git --json --by-file --hide-rate", {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout) as ClocByFileOutput;
}

interface LanguageRow {
    language: string;
    totals: Counts;
    categories?: Map<Category, Counts>;
}

function aggregate(data: ClocByFileOutput): { rows: LanguageRow[]; sum: Counts } {
    // Per-language totals
    const langTotals = new Map<string, Counts>();
    // Per-language per-category totals (only for categorized languages)
    const langCategories = new Map<string, Map<Category, Counts>>();

    for (const [key, value] of Object.entries(data)) {
        if (key === "header" || key === "SUM") continue;

        const entry = value as ClocEntry;
        const lang = entry.language;
        if (lang === undefined) continue;

        // Accumulate language totals
        if (!langTotals.has(lang)) {
            langTotals.set(lang, emptyCounts());
        }
        addCounts(langTotals.get(lang)!, entry);

        // Sub-categorize TS/JS files
        if (CATEGORIZED_LANGUAGES.has(lang)) {
            if (!langCategories.has(lang)) {
                langCategories.set(lang, new Map());
            }
            const catMap = langCategories.get(lang)!;
            const category = classifyFile(key);
            if (!catMap.has(category)) {
                catMap.set(category, emptyCounts());
            }
            addCounts(catMap.get(category)!, entry);
        }
    }

    // Build rows sorted by code descending (cloc default)
    const rows: LanguageRow[] = [...langTotals.entries()]
        .sort(([, a], [, b]) => b.code - a.code)
        .map(([language, totals]) => {
            const row: LanguageRow = { language, totals };
            const cats = langCategories.get(language);
            if (cats && cats.size > 0) {
                row.categories = cats;
            }
            return row;
        });

    // Compute SUM from language totals (not from cloc's SUM, to stay consistent)
    const sum = emptyCounts();
    for (const counts of langTotals.values()) {
        sum.files += counts.files;
        sum.blank += counts.blank;
        sum.comment += counts.comment;
        sum.code += counts.code;
    }

    return { rows, sum };
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

const SEP = "-------------------------------------------------------------------------------";
const CATEGORY_ORDER: Category[] = ["Application", "Test", "Scripts"];

// Column widths matching cloc's native format (total line width = 79)
const NAME_W = 29;
const FILES_W = 5;
const NUM_W = 15;

function formatRow(label: string, counts: Counts, indent: boolean = false): string {
    const name = indent ? `  ${label}` : label;
    return (
        name.padEnd(NAME_W) +
        String(counts.files).padStart(FILES_W) +
        String(counts.blank).padStart(NUM_W) +
        String(counts.comment).padStart(NUM_W) +
        String(counts.code).padStart(NUM_W)
    );
}

function formatHeader(): string {
    return (
        "Language".padEnd(NAME_W) +
        "files".padStart(FILES_W) +
        "blank".padStart(NUM_W) +
        "comment".padStart(NUM_W) +
        "code".padStart(NUM_W)
    );
}

function printTable(rows: LanguageRow[], sum: Counts): void {
    console.log(SEP);
    console.log(formatHeader());
    console.log(SEP);

    for (const row of rows) {
        console.log(formatRow(row.language, row.totals));

        if (row.categories) {
            const nonEmpty = CATEGORY_ORDER.filter((cat) => {
                const counts = row.categories!.get(cat);
                return counts !== undefined && counts.files > 0;
            });
            // Only show sub-rows when files span multiple categories
            if (nonEmpty.length > 1) {
                for (const cat of nonEmpty) {
                    console.log(formatRow(cat, row.categories.get(cat)!, true));
                }
            }
        }
    }

    console.log(SEP);
    console.log(formatRow("SUM:", sum));
    console.log(SEP);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const data = runCloc();
const { rows, sum } = aggregate(data);
printTable(rows, sum);
