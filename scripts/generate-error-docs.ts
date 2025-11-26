#!/usr/bin/env -S node --experimental-strip-types
/**
 * Generate error documentation from diagnostic code definitions
 *
 * This script reads all diagnostic codes from the registry and generates
 * markdown documentation in docs/errors/. It serves as the single source
 * of truth enforcement mechanism, ensuring documentation stays in sync
 * with code definitions.
 *
 * Usage:
 *   npm run docs:errors         # Generate docs
 *   npm run docs:errors:check   # Check if docs are up to date (CI)
 *
 * The --check flag is used in CI to fail the build if docs are stale.
 */
// Import the diagnostic system from built package
import type { DiagnosticDefinition, DiagnosticPhase } from "../packages/core/dist/diagnostics/diagnostic.js";

import * as fs from "node:fs";
import * as path from "node:path";

import { initializeDiagnosticCodes } from "../packages/core/dist/diagnostics/codes/index.js";
import { registry } from "../packages/core/dist/diagnostics/registry.js";

// Initialize all diagnostic codes
initializeDiagnosticCodes();

// Phase display names and order
const PHASE_INFO: Record<DiagnosticPhase, { name: string; description: string }> = {
    lexer: {
        name: "Lexer",
        description: "Errors during lexical analysis (tokenization)",
    },
    parser: {
        name: "Parser",
        description: "Errors during syntax parsing (AST construction)",
    },
    desugarer: {
        name: "Desugarer",
        description: "Errors during desugaring (syntax transformation)",
    },
    typechecker: {
        name: "Type Checker",
        description: "Errors during type checking and inference",
    },
    modules: {
        name: "Module System",
        description: "Errors during module resolution and import/export handling",
    },
    codegen: {
        name: "Code Generator",
        description: "Errors during JavaScript code generation",
    },
    runtime: {
        name: "Runtime",
        description: "Errors during program execution",
    },
};

// Phase order for documentation
const PHASE_ORDER: readonly DiagnosticPhase[] = [
    "lexer",
    "parser",
    "desugarer",
    "typechecker",
    "modules",
    "codegen",
    "runtime",
];

// Output directory
const DOCS_DIR = path.join(process.cwd(), "docs", "errors");

// Header comment for generated files
const GENERATED_HEADER = `<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->

`;

/**
 * Format a code example as a markdown code block
 */
function formatCodeBlock(code: string): string {
    // Ensure the code doesn't have trailing whitespace on each line
    const lines = code.split("\n").map((line) => line.trimEnd());
    return "```vibefun\n" + lines.join("\n") + "\n```";
}

/**
 * Generate the severity badge for a diagnostic
 */
function severityBadge(severity: "error" | "warning"): string {
    return severity === "error" ? "**Error**" : "**Warning**";
}

/**
 * Generate the README.md index file
 */
function generateIndex(): string {
    const lines: string[] = [GENERATED_HEADER];

    lines.push("# Vibefun Error Reference");
    lines.push("");
    lines.push(
        "This reference documents all diagnostic codes (errors and warnings) that the Vibefun compiler can produce. " +
            "Each code has a unique identifier (VFxxxx) that can be used to quickly find documentation.",
    );
    lines.push("");

    // Quick reference table
    lines.push("## Quick Reference");
    lines.push("");
    lines.push("| Code | Name | Severity | Description |");
    lines.push("|------|------|----------|-------------|");

    const allCodes = [...registry.all()].sort((a: DiagnosticDefinition, b: DiagnosticDefinition) =>
        a.code.localeCompare(b.code),
    );

    for (const def of allCodes) {
        const severity = def.severity === "error" ? "Error" : "Warning";
        // Extract first sentence of explanation as description
        const description = def.explanation.split(".")[0] ?? def.messageTemplate;
        lines.push(
            `| [${def.code}](${phaseToFilename(def.phase)}#${def.code.toLowerCase()}) | ${def.title} | ${severity} | ${description} |`,
        );
    }

    lines.push("");

    // Phase sections with links
    lines.push("## Errors by Phase");
    lines.push("");

    for (const phase of PHASE_ORDER) {
        const phaseCodes = registry.byPhase(phase);
        if (phaseCodes.length === 0) continue;

        const info = PHASE_INFO[phase];
        const filename = phaseToFilename(phase);
        const errorCount = phaseCodes.filter((c) => c.severity === "error").length;
        const warningCount = phaseCodes.filter((c) => c.severity === "warning").length;

        let countStr = "";
        if (errorCount > 0 && warningCount > 0) {
            countStr = ` (${errorCount} errors, ${warningCount} warnings)`;
        } else if (errorCount > 0) {
            countStr = ` (${errorCount} errors)`;
        } else if (warningCount > 0) {
            countStr = ` (${warningCount} warnings)`;
        }

        lines.push(`### [${info.name}](${filename})${countStr}`);
        lines.push("");
        lines.push(info.description);
        lines.push("");
    }

    // Statistics
    lines.push("## Statistics");
    lines.push("");
    const totalCodes = allCodes.length;
    const totalErrors = allCodes.filter((c: DiagnosticDefinition) => c.severity === "error").length;
    const totalWarnings = allCodes.filter((c: DiagnosticDefinition) => c.severity === "warning").length;
    lines.push(`- **Total diagnostic codes:** ${totalCodes}`);
    lines.push(`- **Errors:** ${totalErrors}`);
    lines.push(`- **Warnings:** ${totalWarnings}`);
    lines.push("");

    return lines.join("\n");
}

/**
 * Convert a phase to its documentation filename
 */
function phaseToFilename(phase: DiagnosticPhase): string {
    return `${phase}.md`;
}

/**
 * Generate documentation for a single phase
 */
function generatePhaseDoc(phase: DiagnosticPhase): string {
    const codes = [...registry.byPhase(phase)].sort((a: DiagnosticDefinition, b: DiagnosticDefinition) =>
        a.code.localeCompare(b.code),
    );
    if (codes.length === 0) return "";

    const info = PHASE_INFO[phase];
    const lines: string[] = [GENERATED_HEADER];

    lines.push(`# ${info.name} Errors`);
    lines.push("");
    lines.push(info.description);
    lines.push("");

    // Category overview table
    lines.push("## Overview");
    lines.push("");
    lines.push("| Code | Name | Severity |");
    lines.push("|------|------|----------|");

    for (const def of codes) {
        lines.push(`| [${def.code}](#${def.code.toLowerCase()}) | ${def.title} | ${severityBadge(def.severity)} |`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");

    // Individual error documentation
    for (const def of codes) {
        lines.push(generateErrorDoc(def));
        lines.push("");
        lines.push("---");
        lines.push("");
    }

    // Remove trailing separator
    lines.pop();
    lines.pop();

    return lines.join("\n");
}

/**
 * Generate documentation for a single error code
 */
function generateErrorDoc(def: DiagnosticDefinition): string {
    const lines: string[] = [];

    // Heading with code as anchor
    lines.push(`## ${def.code}`);
    lines.push("");
    lines.push(`**${def.title}** ${severityBadge(def.severity)}`);
    lines.push("");

    // Message template
    lines.push("### Message");
    lines.push("");
    lines.push(`> ${def.messageTemplate}`);
    lines.push("");

    // Explanation
    lines.push("### Explanation");
    lines.push("");
    lines.push(def.explanation);
    lines.push("");

    // Example
    lines.push("### Example");
    lines.push("");
    lines.push("**Problem:**");
    lines.push("");
    lines.push(formatCodeBlock(def.example.bad));
    lines.push("");
    lines.push("**Solution:**");
    lines.push("");
    lines.push(formatCodeBlock(def.example.good));
    lines.push("");
    lines.push(`*${def.example.description}*`);
    lines.push("");

    // Hint if available
    if (def.hintTemplate) {
        lines.push("### Hint");
        lines.push("");
        lines.push(`> ${def.hintTemplate}`);
        lines.push("");
    }

    // Related codes if available
    if (def.relatedCodes && def.relatedCodes.length > 0) {
        lines.push("### Related");
        lines.push("");
        const relatedLinks = def.relatedCodes.map((code) => {
            const related = registry.get(code);
            if (related) {
                const filename = phaseToFilename(related.phase);
                return `[${code}](${filename}#${code.toLowerCase()})`;
            }
            return code;
        });
        lines.push(relatedLinks.join(", "));
        lines.push("");
    }

    // See also if available
    if (def.seeAlso && def.seeAlso.length > 0) {
        lines.push("### See Also");
        lines.push("");
        for (const link of def.seeAlso) {
            lines.push(`- [${link}](../${link})`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

/**
 * Write all documentation files
 */
function writeAllDocs(): Map<string, string> {
    const files = new Map<string, string>();

    // Generate index
    files.set("README.md", generateIndex());

    // Generate phase-specific docs
    for (const phase of PHASE_ORDER) {
        const content = generatePhaseDoc(phase);
        if (content) {
            files.set(phaseToFilename(phase), content);
        }
    }

    return files;
}

/**
 * Check if documentation is up to date
 */
function checkDocs(): boolean {
    const files = writeAllDocs();
    let allUpToDate = true;
    const changedFiles: string[] = [];

    for (const [filename, expected] of files) {
        const filepath = path.join(DOCS_DIR, filename);

        if (!fs.existsSync(filepath)) {
            console.error(`Missing: ${filepath}`);
            changedFiles.push(filename);
            allUpToDate = false;
            continue;
        }

        const actual = fs.readFileSync(filepath, "utf-8");
        if (actual !== expected) {
            console.error(`Out of date: ${filepath}`);
            changedFiles.push(filename);
            allUpToDate = false;
        }
    }

    if (!allUpToDate) {
        console.error("");
        console.error("Error documentation is out of date!");
        console.error("Run 'npm run docs:errors' to regenerate.");
        console.error("");
        console.error("Changed files:");
        for (const file of changedFiles) {
            console.error(`  - docs/errors/${file}`);
        }
    }

    return allUpToDate;
}

/**
 * Generate documentation files
 */
function generateDocs(): void {
    const files = writeAllDocs();

    // Ensure output directory exists
    if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    for (const [filename, content] of files) {
        const filepath = path.join(DOCS_DIR, filename);
        fs.writeFileSync(filepath, content, "utf-8");
        console.log(`Generated: ${filepath}`);
    }

    console.log("");
    console.log(`Generated ${files.size} documentation files.`);
}

// Main entry point
const args = process.argv.slice(2);
const isCheckMode = args.includes("--check");

if (isCheckMode) {
    const isUpToDate = checkDocs();
    process.exit(isUpToDate ? 0 : 1);
} else {
    generateDocs();
}
