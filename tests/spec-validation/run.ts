/**
 * Spec validation test suite entry point.
 *
 * Validates the vibefun compiler implementation against the language specification
 * by compiling and running actual .vf code through the CLI.
 *
 * Usage:
 *   pnpm run spec:validate [-- options]
 *
 * Options:
 *   --verbose, -v       Print per-test details to stdout
 *   --report <dir>      Write report files to directory
 *   --section <name>    Run only tests for a specific section
 *   --filter <pattern>  Filter tests by name pattern
 *   --markdown          Output summary as markdown (for CI)
 *
 * Exit codes:
 *   0 = all tests ran (validation failures are expected)
 *   1 = infrastructure error (test framework failure)
 */

import { parseArgs } from "node:util";

import {
    formatSummaryMarkdown,
    hasInfrastructureErrors,
    printResultLine,
    printSummary,
    printVerbose,
    writeReport,
} from "./framework/reporter.ts";
import { runAll } from "./framework/runner.ts";
// Import all section registration modules (side-effect: registers tests)
import "./sections/02-lexical-structure.ts";
import "./sections/03-type-system.ts";
import "./sections/04-expressions.ts";
import "./sections/05-pattern-matching.ts";
import "./sections/06-functions.ts";
import "./sections/07-mutable-references.ts";
import "./sections/07b-let-binding-matrix.ts";
import "./sections/08-modules.ts";
import "./sections/09-error-handling.ts";
import "./sections/10-javascript-interop.ts";
import "./sections/11-stdlib.ts";
import "./sections/12-compilation.ts";

const { values } = parseArgs({
    options: {
        verbose: { type: "boolean", short: "v", default: false },
        report: { type: "string" },
        section: { type: "string" },
        filter: { type: "string" },
        markdown: { type: "boolean", default: false },
    },
    strict: true,
});

// Run tests
const report = runAll({
    ...(values.section !== undefined ? { section: values.section } : {}),
    ...(values.filter !== undefined ? { filter: values.filter } : {}),
});

// Output results
if (values.markdown) {
    console.log(formatSummaryMarkdown(report));
} else {
    printSummary(report);
    if (values.verbose) {
        printVerbose(report);
    }
    printResultLine(report);
}

// Write report files if requested
if (values.report) {
    writeReport(report, values.report);
}

// Exit with error only for infrastructure failures
if (hasInfrastructureErrors(report)) {
    process.exit(1);
}
