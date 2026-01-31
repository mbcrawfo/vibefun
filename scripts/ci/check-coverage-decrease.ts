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

interface CoverageSummary {
    total: {
        lines: { pct: number };
        statements: { pct: number };
        functions: { pct: number };
        branches: { pct: number };
    };
}

interface CoverageResult {
    status: "improved" | "maintained" | "decreased" | "skipped" | "new";
    baseCoverage?: number;
    currentCoverage?: number;
    change?: number;
    reason?: string;
}

const THRESHOLD = 0.01; // Tolerance for floating point precision

const baseCoveragePath = process.env["BASE_COVERAGE_PATH"] ?? "base-coverage";

/**
 * Type guard to validate coverage summary structure
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
    if (typeof total["lines"] !== "object" || total["lines"] === null) {
        return false;
    }
    const lines = total["lines"] as Record<string, unknown>;
    return typeof lines["pct"] === "number";
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

function checkCoverage(): CoverageResult {
    const currentPath = path.join("coverage", "coverage-summary.json");
    const basePath = path.join(baseCoveragePath, "coverage-summary.json");

    const current = readCoverageSummary(currentPath);
    const base = readCoverageSummary(basePath);

    if (!current) {
        return {
            status: "skipped",
            reason: "No coverage data found",
        };
    }

    const currentCoverage = current.total.lines.pct;

    if (!base) {
        return {
            status: "new",
            currentCoverage,
            reason: "No base coverage to compare (first coverage run)",
        };
    }

    const baseCoverage = base.total.lines.pct;
    const change = currentCoverage - baseCoverage;

    if (currentCoverage < baseCoverage - THRESHOLD) {
        return {
            status: "decreased",
            baseCoverage,
            currentCoverage,
            change,
        };
    } else if (Math.abs(change) <= THRESHOLD) {
        return {
            status: "maintained",
            baseCoverage,
            currentCoverage,
            change,
        };
    } else {
        return {
            status: "improved",
            baseCoverage,
            currentCoverage,
            change,
        };
    }
}

function main(): void {
    console.log("Checking combined coverage...\n");

    const result = checkCoverage();

    switch (result.status) {
        case "skipped":
            console.log(`   Skipped - ${result.reason}`);
            console.log("\nCoverage check skipped.");
            return;
        case "new":
            console.log(`   New coverage at ${result.currentCoverage}%`);
            break;
        case "maintained":
            console.log(`   Coverage maintained at ~${result.currentCoverage}%`);
            break;
        case "improved":
            console.log(
                `   Coverage improved by ${result.change?.toFixed(2)}% ` +
                    `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
            );
            break;
        case "decreased":
            console.log(
                `   Coverage decreased by ${Math.abs(result.change ?? 0).toFixed(2)}% ` +
                    `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
            );
            console.log("\nCoverage check failed. Please add tests to maintain or improve coverage.");
            process.exit(1);
    }

    console.log("\nCoverage check passed.");
}

main();
