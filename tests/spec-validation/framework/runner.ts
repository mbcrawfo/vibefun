/**
 * Test registry and executor for spec validation.
 */

import type { Report, RunOptions, SectionSummary, SpecTest, TestRecord } from "./types.js";

/** Global test registry */
const tests: SpecTest[] = [];

/**
 * Register a spec validation test.
 */
export function registerTest(test: SpecTest): void {
    tests.push(test);
}

/**
 * Convenience function to register a test with less boilerplate.
 */
export function test(section: string, specRef: string, name: string, run: SpecTest["run"]): void {
    registerTest({ name, section, specRef, run });
}

/**
 * Get all registered tests (for inspection/debugging).
 */
export function getTests(): readonly SpecTest[] {
    return tests;
}

/**
 * Run all registered tests matching the given options and return a report.
 */
export function runAll(options: RunOptions = {}): Report {
    const filtered = tests.filter((t) => {
        if (options.section && !t.section.includes(options.section)) {
            return false;
        }
        if (options.filter && !t.name.toLowerCase().includes(options.filter.toLowerCase())) {
            return false;
        }
        return true;
    });

    // Group tests by section (preserving registration order)
    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, SpecTest[]>();
    for (const t of filtered) {
        if (!sectionMap.has(t.section)) {
            sectionOrder.push(t.section);
            sectionMap.set(t.section, []);
        }
        sectionMap.get(t.section)?.push(t);
    }

    const sections: SectionSummary[] = [];

    for (const sectionName of sectionOrder) {
        const sectionTests = sectionMap.get(sectionName) ?? [];
        const summary: SectionSummary = {
            section: sectionName,
            pass: 0,
            fail: 0,
            error: 0,
            total: sectionTests.length,
            tests: [],
        };

        for (const t of sectionTests) {
            let record: TestRecord;
            try {
                const result = t.run();
                record = {
                    name: t.name,
                    specRef: t.specRef,
                    status: result.status,
                    ...(result.message !== undefined ? { message: result.message } : {}),
                };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                record = {
                    name: t.name,
                    specRef: t.specRef,
                    status: "error",
                    message: `Uncaught error: ${msg}`,
                };
            }

            summary[record.status]++;
            summary.tests.push(record);
        }

        sections.push(summary);
    }

    const totals = { pass: 0, fail: 0, error: 0, total: 0 };
    for (const s of sections) {
        totals.pass += s.pass;
        totals.fail += s.fail;
        totals.error += s.error;
        totals.total += s.total;
    }

    return {
        timestamp: new Date().toISOString(),
        sections,
        totals,
    };
}
