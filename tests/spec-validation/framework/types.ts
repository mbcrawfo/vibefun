/**
 * Type definitions for the spec validation test suite.
 */

/** Status of a single test */
export type TestStatus = "pass" | "fail" | "error";

/** Result from running a single spec test */
export interface TestResult {
    status: TestStatus;
    /** Brief reason for fail/error */
    message?: string;
}

/** A single spec validation test */
export interface SpecTest {
    /** Human-readable test name */
    name: string;
    /** Spec section, e.g., "02-lexical-structure" */
    section: string;
    /** Reference to spec file, e.g., "02-lexical-structure/tokens.md" */
    specRef: string;
    /** Synchronous test function */
    run: () => TestResult;
}

/** Result of a single test after execution */
export interface TestRecord {
    name: string;
    specRef: string;
    status: TestStatus;
    message?: string;
}

/** Aggregated results for a spec section */
export interface SectionSummary {
    section: string;
    pass: number;
    fail: number;
    error: number;
    total: number;
    tests: TestRecord[];
}

/** Complete report from a validation run */
export interface Report {
    timestamp: string;
    sections: SectionSummary[];
    totals: {
        pass: number;
        fail: number;
        error: number;
        total: number;
    };
}

/** Options for filtering which tests to run */
export interface RunOptions {
    /** Run only tests in this section */
    section?: string;
    /** Filter tests by name pattern */
    filter?: string;
}

/** Result from a CLI invocation */
export interface CliResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
