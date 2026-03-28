/**
 * Helper utilities for spec validation tests.
 *
 * Provides functions to compile and run vibefun source code via the CLI,
 * and assertion helpers that return TestResult objects.
 */

import type { CliResult, TestResult } from "./types.js";

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** Path to the compiled CLI binary */
const CLI_PATH = resolve(import.meta.dirname, "../../../packages/cli/dist/index.js");

/**
 * Run the vibefun CLI with the given arguments.
 */
export function runVibefun(args: string[], options: { cwd?: string; stdin?: string } = {}): CliResult {
    const result = spawnSync("node", [CLI_PATH, ...args], {
        cwd: options.cwd,
        encoding: "utf-8",
        env: { ...process.env, NO_COLOR: "1" },
        ...(options.stdin !== undefined ? { input: options.stdin } : {}),
        timeout: 30_000,
    });

    return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.status ?? -1,
    };
}

/**
 * Compile vibefun source from stdin. Returns the CLI result.
 */
export function compileSource(source: string): CliResult {
    return runVibefun(["compile", "-"], { stdin: source });
}

/**
 * Run vibefun source from stdin. Returns the CLI result.
 */
export function runSource(source: string): CliResult {
    return runVibefun(["run", "-"], { stdin: source });
}

/**
 * Run a vibefun file by path. Returns the CLI result.
 */
export function runFile(filePath: string, cwd?: string): CliResult {
    return runVibefun(["run", filePath], cwd !== undefined ? { cwd } : {});
}

/**
 * Compile a vibefun file by path. Returns the CLI result.
 */
export function compileFile(filePath: string, cwd?: string): CliResult {
    return runVibefun(["compile", filePath], cwd !== undefined ? { cwd } : {});
}

// --- Assertion helpers ---

/**
 * Assert that the source compiles successfully (exit code 0).
 */
export function expectCompiles(source: string): TestResult {
    const result = compileSource(source);
    if (result.exitCode === 0) {
        return { status: "pass" };
    }
    return {
        status: "fail",
        message: `Expected compilation success, got exit code ${result.exitCode}`,
    };
}

/**
 * Assert that the source fails to compile (exit code 1).
 * Optionally check for a specific error code in stderr.
 */
export function expectCompileError(source: string, errorCode?: string): TestResult {
    const result = compileSource(source);
    if (result.exitCode !== 1) {
        return {
            status: "fail",
            message: `Expected compilation error (exit 1), got exit code ${result.exitCode}`,
        };
    }
    if (errorCode && !result.stderr.includes(errorCode)) {
        return {
            status: "fail",
            message: `Expected error code ${errorCode} in stderr`,
        };
    }
    return { status: "pass" };
}

/**
 * Assert that the source compiles and runs successfully, producing expected output.
 */
export function expectRunOutput(source: string, expected: string): TestResult {
    const result = runSource(source);
    if (result.exitCode !== 0) {
        return {
            status: "fail",
            message: `Expected successful run, got exit code ${result.exitCode}`,
        };
    }
    if (!result.stdout.includes(expected)) {
        return {
            status: "fail",
            message: `Expected output to contain "${expected}", got "${result.stdout.trim()}"`,
        };
    }
    return { status: "pass" };
}

/**
 * Assert that the source compiles and runs, producing output matching exactly.
 */
export function expectRunOutputExact(source: string, expected: string): TestResult {
    const result = runSource(source);
    if (result.exitCode !== 0) {
        return {
            status: "fail",
            message: `Expected successful run, got exit code ${result.exitCode}`,
        };
    }
    if (result.stdout.trim() !== expected.trim()) {
        return {
            status: "fail",
            message: `Expected output "${expected.trim()}", got "${result.stdout.trim()}"`,
        };
    }
    return { status: "pass" };
}

/**
 * Assert that the source compiles but produces a runtime error.
 */
export function expectRuntimeError(source: string, errorMsg?: string): TestResult {
    // First verify compilation succeeds - otherwise a compile error would be a false pass
    const compileResult = compileSource(source);
    if (compileResult.exitCode !== 0) {
        return {
            status: "fail",
            message: `Expected runtime error but compilation failed with exit code ${compileResult.exitCode}`,
        };
    }

    const result = runSource(source);
    if (result.exitCode === 0) {
        return {
            status: "fail",
            message: "Expected runtime error, but program exited successfully",
        };
    }
    if (errorMsg && !result.stderr.includes(errorMsg)) {
        return {
            status: "fail",
            message: `Expected error containing "${errorMsg}" in stderr`,
        };
    }
    return { status: "pass" };
}

/**
 * Assert that the source compiles and runs without error (ignoring output).
 */
export function expectRuns(source: string): TestResult {
    const result = runSource(source);
    if (result.exitCode === 0) {
        return { status: "pass" };
    }
    return {
        status: "fail",
        message: `Expected successful run, got exit code ${result.exitCode}`,
    };
}

/**
 * Return a skip result with a reason.
 */
export function skip(reason: string): TestResult {
    return { status: "skip", message: reason };
}

// --- Temp directory helpers for multi-file tests ---

/**
 * Create a unique temp directory for multi-file tests.
 */
export function createTempDir(): string {
    const dir = join(tmpdir(), `vf-spec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * Write a file into a temp directory, creating subdirectories as needed.
 */
export function writeTempFile(dir: string, relativePath: string, content: string): void {
    const fullPath = join(dir, relativePath);
    const parent = dirname(fullPath);
    if (!existsSync(parent)) {
        mkdirSync(parent, { recursive: true });
    }
    writeFileSync(fullPath, content, "utf-8");
}

/**
 * Clean up a temp directory.
 */
export function cleanupTempDir(dir: string): void {
    rmSync(dir, { recursive: true, force: true });
}

/**
 * Wrap code with console.log output boilerplate for runtime assertions.
 * Uses external console_log declaration and unsafe block.
 */
export function withOutput(code: string, outputExpr: string): string {
    return [
        'external console_log: (String) -> Unit = "console.log";',
        code,
        `let _ = unsafe { console_log(${outputExpr}) };`,
    ].join("\n");
}

/**
 * Wrap code that outputs multiple values.
 * Each expression in outputExprs gets its own console_log call.
 */
export function withOutputs(code: string, outputExprs: string[]): string {
    const logLines = outputExprs.map((expr, i) => `let _out${i} = unsafe { console_log(${expr}) };`).join("\n");
    return ['external console_log: (String) -> Unit = "console.log";', code, logLines].join("\n");
}
