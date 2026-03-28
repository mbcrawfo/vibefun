/**
 * Report formatting and output for spec validation results.
 */

import type { Report, SectionSummary, TestRecord, TestStatus } from "./types.ts";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// --- Console output ---

/**
 * Print a section-by-section summary table to stdout.
 */
export function printSummary(report: Report): void {
    console.log("\n=== Vibefun Spec Validation Report ===");
    console.log(`Timestamp: ${report.timestamp}\n`);

    const colWidths = { section: 30, pass: 6, fail: 6, error: 6, total: 6 };
    const header = [
        "Section".padEnd(colWidths.section),
        "Pass".padStart(colWidths.pass),
        "Fail".padStart(colWidths.fail),
        "Error".padStart(colWidths.error),
        "Total".padStart(colWidths.total),
    ].join("  ");

    console.log(header);
    console.log("-".repeat(header.length));

    for (const section of report.sections) {
        const row = [
            section.section.padEnd(colWidths.section),
            String(section.pass).padStart(colWidths.pass),
            String(section.fail).padStart(colWidths.fail),
            String(section.error).padStart(colWidths.error),
            String(section.total).padStart(colWidths.total),
        ].join("  ");
        console.log(row);
    }

    console.log("-".repeat(header.length));
    const totalsRow = [
        "TOTAL".padEnd(colWidths.section),
        String(report.totals.pass).padStart(colWidths.pass),
        String(report.totals.fail).padStart(colWidths.fail),
        String(report.totals.error).padStart(colWidths.error),
        String(report.totals.total).padStart(colWidths.total),
    ].join("  ");
    console.log(totalsRow);
    console.log();
}

/**
 * Print per-test details to stdout.
 */
export function printVerbose(report: Report): void {
    for (const section of report.sections) {
        console.log(`\n--- ${section.section} ---`);
        for (const t of section.tests) {
            const icon = statusIcon(t.status);
            const msg = t.message ? ` (${t.message})` : "";
            console.log(`  ${icon} ${t.name}${msg}`);
        }
    }
    console.log();
}

function statusIcon(status: TestStatus): string {
    switch (status) {
        case "pass":
            return "[PASS]";
        case "fail":
            return "[FAIL]";
        case "error":
            return "[ERR!]";
    }
}

// --- Markdown output ---

/**
 * Format the report as a markdown summary (for PR comments).
 */
export function formatSummaryMarkdown(report: Report): string {
    const lines: string[] = [];
    lines.push("## Vibefun Spec Validation Report");
    lines.push("");
    lines.push(
        `**${report.totals.pass}** passed, **${report.totals.fail}** failed, **${report.totals.error}** errors out of **${report.totals.total}** tests`,
    );
    lines.push("");
    lines.push("| Section | Pass | Fail | Error | Total |");
    lines.push("|---------|-----:|-----:|------:|------:|");

    for (const section of report.sections) {
        lines.push(`| ${section.section} | ${section.pass} | ${section.fail} | ${section.error} | ${section.total} |`);
    }

    lines.push(
        `| **TOTAL** | **${report.totals.pass}** | **${report.totals.fail}** | **${report.totals.error}** | **${report.totals.total}** |`,
    );
    lines.push("");
    lines.push(`_Generated at ${report.timestamp}_`);
    lines.push("");
    return lines.join("\n");
}

/**
 * Format a detailed markdown report with per-test results.
 */
function formatDetailedMarkdown(report: Report): string {
    const lines: string[] = [];
    lines.push("# Vibefun Spec Validation - Detailed Report");
    lines.push("");
    lines.push(`Generated: ${report.timestamp}`);
    lines.push("");

    // Summary table
    lines.push("## Summary");
    lines.push("");
    lines.push("| Section | Pass | Fail | Error | Total |");
    lines.push("|---------|-----:|-----:|------:|------:|");
    for (const section of report.sections) {
        lines.push(`| ${section.section} | ${section.pass} | ${section.fail} | ${section.error} | ${section.total} |`);
    }
    lines.push(
        `| **TOTAL** | **${report.totals.pass}** | **${report.totals.fail}** | **${report.totals.error}** | **${report.totals.total}** |`,
    );
    lines.push("");

    // Per-section details
    lines.push("## Details");
    lines.push("");
    for (const section of report.sections) {
        lines.push(`### ${section.section}`);
        lines.push("");
        lines.push("| Status | Test | Spec Reference | Message |");
        lines.push("|--------|------|----------------|---------|");
        for (const t of section.tests) {
            const icon = markdownStatusIcon(t.status);
            const msg = escapeMarkdownCell(t.message ?? "");
            lines.push(`| ${icon} | ${escapeMarkdownCell(t.name)} | ${escapeMarkdownCell(t.specRef)} | ${msg} |`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

function escapeMarkdownCell(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdownStatusIcon(status: TestStatus): string {
    switch (status) {
        case "pass":
            return "PASS";
        case "fail":
            return "FAIL";
        case "error":
            return "ERROR";
    }
}

// --- File output ---

/**
 * Write report files to a directory.
 * Creates: summary.txt, details.json, report.md
 */
export function writeReport(report: Report, dir: string): void {
    mkdirSync(dir, { recursive: true });

    // summary.txt - plain text summary
    const summaryLines: string[] = [];
    summaryLines.push("Vibefun Spec Validation Report");
    summaryLines.push(`Timestamp: ${report.timestamp}`);
    summaryLines.push("");
    for (const section of report.sections) {
        summaryLines.push(
            `${section.section}: ${section.pass} pass, ${section.fail} fail, ${section.error} error (${section.total} total)`,
        );
    }
    summaryLines.push("");
    summaryLines.push(
        `TOTAL: ${report.totals.pass} pass, ${report.totals.fail} fail, ${report.totals.error} error (${report.totals.total} total)`,
    );
    writeFileSync(join(dir, "summary.txt"), summaryLines.join("\n"), "utf-8");

    // details.json - machine-readable
    writeFileSync(join(dir, "details.json"), JSON.stringify(report, null, 2), "utf-8");

    // report.md - detailed markdown
    writeFileSync(join(dir, "report.md"), formatDetailedMarkdown(report), "utf-8");

    console.error(`Report written to ${dir}/`);
}

/**
 * Format a brief summary line for the report totals.
 */
export function formatTotalsLine(report: Report): string {
    return `${report.totals.pass} passed, ${report.totals.fail} failed, ${report.totals.error} errors (${report.totals.total} total)`;
}

/**
 * Determine if the report contains infrastructure errors
 * (errors in the test framework itself, not validation failures).
 */
export function hasInfrastructureErrors(report: Report): boolean {
    return report.totals.error > 0;
}

/**
 * Print a one-line result for quick feedback.
 */
export function printResultLine(report: Report): void {
    const line = formatTotalsLine(report);
    if (hasInfrastructureErrors(report)) {
        console.log(`RESULT: ${line} (has infrastructure errors)`);
    } else if (report.totals.fail > 0) {
        console.log(`RESULT: ${line} (has validation failures - expected for incomplete features)`);
    } else {
        console.log(`RESULT: ${line}`);
    }
}

// Helper to abbreviate section summary for console
export function formatSectionCounts(s: SectionSummary): string {
    return `${s.pass}/${s.total} pass`;
}

// Helper to format test record for console
export function formatTestRecord(t: TestRecord): string {
    const icon = statusIcon(t.status);
    const msg = t.message ? ` - ${t.message}` : "";
    return `${icon} ${t.name}${msg}`;
}
