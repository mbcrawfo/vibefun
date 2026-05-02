/**
 * Helpers for e2e tests that spawn the compiled Vibefun CLI.
 *
 * These tests cover cross-package behaviour that unit tests can't reach:
 * actually invoking the CLI binary, resolving `@vibefun/std` from node's
 * module loader, reading multi-file projects, and comparing the final
 * stdout/stderr/exit-code of a real `node` run.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Path to the compiled CLI binary. The CLI must be built (`pnpm run build`)
 * before e2e tests run; the root `verify` script does this sequentially.
 */
export const CLI_PATH = resolve(HERE, "../../packages/cli/dist/index.js");

/**
 * Repo root — used as the default cwd for the spawned CLI so that pnpm's
 * root `node_modules/@vibefun/std` symlink is on the module resolution
 * path. Multi-file tests override this with their tempdir.
 */
export const REPO_ROOT = resolve(HERE, "../..");

export interface CliResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
}

export interface RunOptions {
    /** Working directory for the spawned CLI. Defaults to repo root. */
    readonly cwd?: string;
    /** Stdin content to pipe into the CLI. */
    readonly stdin?: string;
    /** Override timeout (ms). Defaults to 30s. */
    readonly timeoutMs?: number;
}

/**
 * Invoke `node <CLI_PATH> <args…>` and return the combined output.
 * Throws on timeout or unclean exit — those are infrastructure failures,
 * not test failures, so callers don't accidentally swallow them.
 */
export function runCli(args: string[], options: RunOptions = {}): CliResult {
    const result = spawnSync("node", [CLI_PATH, ...args], {
        cwd: options.cwd ?? REPO_ROOT,
        encoding: "utf-8",
        env: { ...process.env, NO_COLOR: "1" },
        ...(options.stdin !== undefined ? { input: options.stdin } : {}),
        timeout: options.timeoutMs ?? 30_000,
    });

    if (result.error !== undefined) {
        const reason = result.error.message.includes("ETIMEDOUT") ? "timed out" : result.error.message;
        throw new Error(`Infrastructure error: CLI process ${reason}`);
    }
    if (result.status === null) {
        const signal = result.signal !== null ? ` (signal ${result.signal})` : "";
        throw new Error(`Infrastructure error: CLI process did not exit cleanly${signal}`);
    }

    return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.status,
    };
}

export function compileSource(source: string, options: RunOptions = {}): CliResult {
    return runCli(["compile", "-"], { ...options, stdin: source });
}

export function runSource(source: string, options: RunOptions = {}): CliResult {
    return runCli(["run", "-"], { ...options, stdin: source });
}

export function compileFile(filePath: string, cwd?: string): CliResult {
    return runCli(["compile", filePath], cwd !== undefined ? { cwd } : {});
}

export function runFile(filePath: string, cwd?: string): CliResult {
    return runCli(["run", filePath], cwd !== undefined ? { cwd } : {});
}

/**
 * Create a temporary project directory populated with `files`. Keys are
 * paths relative to the project root. Symlinks the repo's `node_modules`
 * into the project so `@vibefun/std` (and any other workspace packages)
 * resolve when `node` executes the compiled output. Returns the absolute
 * project path and a dispose function that deletes the whole tree.
 */
export function createTempProject(files: Record<string, string>): { dir: string; dispose: () => void } {
    const dir = mkdtempSync(join(tmpdir(), "vibefun-e2e-"));
    for (const [relPath, content] of Object.entries(files)) {
        const full = join(dir, relPath);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content, "utf-8");
    }
    try {
        symlinkSync(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"), "dir");
    } catch {
        // If the symlink fails (e.g. platform limitation) leave it —
        // tests that don't import @vibefun/std still work, and tests
        // that do will surface a clear runtime MODULE_NOT_FOUND.
    }
    return {
        dir,
        dispose: () => {
            rmSync(dir, { recursive: true, force: true });
        },
    };
}

/**
 * Wrap vibefun source with the standard spec-test boilerplate: stdlib
 * imports + a single `console_log` call for runtime output.
 */
export function withOutput(code: string, outputExpr: string): string {
    return [
        'import { String, List, Option, Result, Int, Float, Math } from "@vibefun/std";',
        'external console_log: (String) -> Unit = "console.log";',
        code,
        `let _ = unsafe { console_log(${outputExpr}) };`,
    ].join("\n");
}
