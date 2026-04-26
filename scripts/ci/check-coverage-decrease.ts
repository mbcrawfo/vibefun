#!/usr/bin/env -S node --experimental-strip-types
/**
 * Check for coverage decrease in the combined coverage report
 *
 * Usage:
 *   node --experimental-strip-types scripts/ci/check-coverage-decrease.ts
 *
 * Environment:
 *   BASE_COVERAGE_PATH - Path to base coverage reports (default: base-coverage)
 */
import * as fs from "node:fs";
import * as path from "node:path";

type CoverageMetric = "lines" | "statements" | "functions" | "branches";

const METRICS: readonly CoverageMetric[] = ["lines", "statements", "functions", "branches"];

interface CoverageSummary {
    total: {
        lines: { pct: number };
        statements: { pct: number };
        functions: { pct: number };
        branches: { pct: number };
    };
}

interface MetricResult {
    metric: CoverageMetric;
    status: "improved" | "maintained" | "decreased" | "skipped" | "new";
    baseCoverage?: number;
    currentCoverage?: number;
    change?: number;
    reason?: string;
}

const THRESHOLD = 0.01; // Tolerance for floating point precision

const baseCoveragePath = process.env["BASE_COVERAGE_PATH"] ?? "base-coverage";

// Set ALLOW_MISSING_BASE_COVERAGE=true only on the very first coverage run
// (before any base artifact exists). Otherwise a transient artifact-download
// failure in CI would silently disable the regression gate, because the
// download step is `continue-on-error: true` in the workflow.
const allowMissingBaseCoverage = process.env["ALLOW_MISSING_BASE_COVERAGE"] === "true";

/**
 * Type guard to validate coverage summary structure across every metric
 * the script reads. Without this, a malformed summary that happens to
 * carry `total.lines.pct` but is missing one of the other metrics would
 * pass the guard and then crash inside checkMetric.
 */
function isCoverageSummary(value: unknown): value is CoverageSummary {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    if (typeof obj["total"] !== "object" || obj["total"] === null) {
        return false;
    }
    const total = obj["total"] as Record<string, unknown>;
    return METRICS.every((metric) => {
        const metricValue = total[metric];
        if (typeof metricValue !== "object" || metricValue === null) {
            return false;
        }
        const metricObj = metricValue as Record<string, unknown>;
        return typeof metricObj["pct"] === "number" && Number.isFinite(metricObj["pct"]);
    });
}

function readCoverageSummary(filepath: string): CoverageSummary | null {
    if (!fs.existsSync(filepath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(filepath, "utf-8");
        const parsed: unknown = JSON.parse(content);
        if (!isCoverageSummary(parsed)) {
            console.warn(`Warning: Invalid coverage format in ${filepath}`);
            return null;
        }
        return parsed;
    } catch (error) {
        console.warn(`Warning: Failed to parse ${filepath}: ${error}`);
        return null;
    }
}

function checkMetric(
    metric: CoverageMetric,
    current: CoverageSummary | null,
    base: CoverageSummary | null,
): MetricResult {
    if (!current) {
        // Fail closed: missing current coverage usually means coverage
        // generation or reporting broke in this run, and silently passing
        // would let regressions land undetected.
        return { metric, status: "decreased", reason: "No current coverage data found" };
    }

    const currentCoverage = current.total[metric].pct;

    if (!base) {
        if (allowMissingBaseCoverage) {
            return {
                metric,
                status: "new",
                currentCoverage,
                reason: "No base coverage to compare (explicit bootstrap run)",
            };
        }
        return {
            metric,
            status: "decreased",
            currentCoverage,
            reason: "No base coverage data found (set ALLOW_MISSING_BASE_COVERAGE=true to bootstrap)",
        };
    }

    const baseCoverage = base.total[metric].pct;
    const change = currentCoverage - baseCoverage;

    if (currentCoverage < baseCoverage - THRESHOLD) {
        return { metric, status: "decreased", baseCoverage, currentCoverage, change };
    } else if (Math.abs(change) <= THRESHOLD) {
        return { metric, status: "maintained", baseCoverage, currentCoverage, change };
    } else {
        return { metric, status: "improved", baseCoverage, currentCoverage, change };
    }
}

function checkCoverage(): MetricResult[] {
    const currentPath = path.join("coverage", "coverage-summary.json");
    const basePath = path.join(baseCoveragePath, "coverage-summary.json");

    const current = readCoverageSummary(currentPath);
    const base = readCoverageSummary(basePath);

    return METRICS.map((metric) => checkMetric(metric, current, base));
}

function main(): void {
    console.log("Checking combined coverage across lines, statements, functions, branches...\n");

    const results = checkCoverage();
    let decreased = false;

    for (const result of results) {
        const label = result.metric.padEnd(11);
        switch (result.status) {
            case "skipped":
                console.log(`  ${label} skipped - ${result.reason}`);
                break;
            case "new":
                console.log(`  ${label} new coverage at ${result.currentCoverage}%`);
                break;
            case "maintained":
                console.log(`  ${label} maintained at ~${result.currentCoverage}%`);
                break;
            case "improved":
                console.log(
                    `  ${label} improved by ${result.change?.toFixed(2)}% ` +
                        `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
                );
                break;
            case "decreased":
                if (result.baseCoverage === undefined || result.currentCoverage === undefined) {
                    console.log(`  ${label} decreased - ${result.reason ?? "coverage data missing"}`);
                } else {
                    console.log(
                        `  ${label} decreased by ${Math.abs(result.change ?? 0).toFixed(2)}% ` +
                            `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
                    );
                }
                decreased = true;
                break;
        }
    }

    if (decreased) {
        console.log(
            "\nCoverage check failed. One or more metrics decreased. Please add tests to maintain or improve coverage.",
        );
        process.exit(1);
    }

    if (results.every((r) => r.status === "skipped")) {
        console.log("\nCoverage check skipped.");
        return;
    }

    console.log("\nCoverage check passed.");
}

main();
