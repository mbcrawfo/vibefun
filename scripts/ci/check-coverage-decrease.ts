#!/usr/bin/env -S node --experimental-strip-types
/**
 * Check for coverage decrease across all packages
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

interface PackageResult {
    package: string;
    status: "improved" | "maintained" | "decreased" | "skipped" | "new";
    baseCoverage?: number;
    currentCoverage?: number;
    change?: number;
    reason?: string;
}

const PACKAGES = ["core", "stdlib", "cli"];
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

function checkPackage(pkg: string): PackageResult {
    const currentPath = path.join("packages", pkg, "coverage", "coverage-summary.json");
    const basePath = path.join(baseCoveragePath, "packages", pkg, "coverage", "coverage-summary.json");

    const current = readCoverageSummary(currentPath);
    const base = readCoverageSummary(basePath);

    if (!current) {
        return {
            package: pkg,
            status: "skipped",
            reason: "No coverage data (package may have no tests)",
        };
    }

    const currentCoverage = current.total.lines.pct;

    if (!base) {
        return {
            package: pkg,
            status: "new",
            currentCoverage,
            reason: "No base coverage to compare (new package or first coverage)",
        };
    }

    const baseCoverage = base.total.lines.pct;
    const change = currentCoverage - baseCoverage;

    if (currentCoverage < baseCoverage - THRESHOLD) {
        return {
            package: pkg,
            status: "decreased",
            baseCoverage,
            currentCoverage,
            change,
        };
    } else if (Math.abs(change) <= THRESHOLD) {
        return {
            package: pkg,
            status: "maintained",
            baseCoverage,
            currentCoverage,
            change,
        };
    } else {
        return {
            package: pkg,
            status: "improved",
            baseCoverage,
            currentCoverage,
            change,
        };
    }
}

function main(): void {
    console.log("Checking coverage across all packages...\n");

    const results: PackageResult[] = PACKAGES.map(checkPackage);
    let hasFailure = false;

    for (const result of results) {
        const pkgName = `@vibefun/${result.package}`;

        switch (result.status) {
            case "skipped":
                console.log(`   ${pkgName}: Skipped - ${result.reason}`);
                break;
            case "new":
                console.log(`   ${pkgName}: New coverage at ${result.currentCoverage}%`);
                break;
            case "maintained":
                console.log(`   ${pkgName}: Coverage maintained at ~${result.currentCoverage}%`);
                break;
            case "improved":
                console.log(
                    `   ${pkgName}: Coverage improved by ${result.change?.toFixed(2)}% ` +
                        `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
                );
                break;
            case "decreased":
                console.log(
                    `   ${pkgName}: Coverage decreased by ${Math.abs(result.change ?? 0).toFixed(2)}% ` +
                        `(${result.baseCoverage}% -> ${result.currentCoverage}%)`,
                );
                hasFailure = true;
                break;
        }
    }

    console.log("");

    if (hasFailure) {
        console.log("Coverage check failed. Please add tests to maintain or improve coverage.");
        process.exit(1);
    } else {
        console.log("Coverage check passed.");
    }
}

main();
