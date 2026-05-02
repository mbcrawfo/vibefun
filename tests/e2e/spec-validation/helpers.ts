/**
 * Vitest-flavoured assertion wrappers for the spec-validation suite.
 *
 * These wrap the lower-level CLI primitives in `../helpers.js` with
 * compact `expect*` helpers that throw on mismatch (so vitest fails
 * the surrounding `it()` automatically). Keeping the spec idiom local
 * to this folder lets the rest of `tests/e2e/` use raw `CliResult`
 * objects without conflicting conventions.
 */

import { expect } from "vitest";

import { compileSource, runSource } from "../helpers.js";

export { compileFile, createTempProject, runFile } from "../helpers.js";
export type { CliResult } from "../helpers.js";

/**
 * Stdlib imports prepended to every wrapped program. Variant constructors
 * (Cons, Nil, Some, None, Ok, Err) remain ambient and are deliberately
 * absent here.
 */
const STDLIB_IMPORT = 'import { String, List, Option, Result, Int, Float, Math } from "@vibefun/std";';
const CONSOLE_LOG_FFI = 'external console_log: (String) -> Unit = "console.log";';

/**
 * Wrap code with a single `console_log` call so its String-typed output
 * expression is captured to stdout.
 */
export function withOutput(code: string, outputExpr: string): string {
    return [STDLIB_IMPORT, CONSOLE_LOG_FFI, code, `let _ = unsafe { console_log(${outputExpr}) };`].join("\n");
}

/**
 * Wrap code that emits multiple lines — one `console_log` per output
 * expression.
 */
export function withOutputs(code: string, outputExprs: string[]): string {
    const logLines = outputExprs.map((expr, i) => `let _out${i} = unsafe { console_log(${expr}) };`).join("\n");
    return [STDLIB_IMPORT, CONSOLE_LOG_FFI, code, logLines].join("\n");
}

export function expectCompiles(source: string): void {
    const r = compileSource(source);
    expect(r.exitCode, `expected compile success\nstderr:\n${r.stderr}`).toBe(0);
}

export function expectCompileError(source: string, errorCode?: string): void {
    const r = compileSource(source);
    expect(r.exitCode, `expected compile error (exit 1), got ${r.exitCode}`).toBe(1);
    if (errorCode !== undefined) {
        expect(r.stderr, `expected error code ${errorCode} in stderr`).toContain(errorCode);
    }
}

export function expectRunOutput(source: string, expected: string): void {
    const r = runSource(source);
    expect(r.exitCode, `expected successful run\nstderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout.trim()).toBe(expected.trim());
}

export function expectRuntimeError(source: string, errorMsg?: string): void {
    const compile = compileSource(source);
    expect(compile.exitCode, `expected compile success before runtime error\nstderr:\n${compile.stderr}`).toBe(0);
    const run = runSource(source);
    expect(run.exitCode, `expected runtime error, but program exited 0`).not.toBe(0);
    if (errorMsg !== undefined) {
        expect(run.stderr, `expected error message containing "${errorMsg}"`).toContain(errorMsg);
    }
}

export function expectRuns(source: string): void {
    const r = runSource(source);
    expect(r.exitCode, `expected successful run\nstderr:\n${r.stderr}`).toBe(0);
}
