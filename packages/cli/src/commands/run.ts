/**
 * Run command implementation
 *
 * Compiles a .vf file and executes the resulting JavaScript.
 * The compiled JS is piped to `node --input-type=module` via stdin.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import { createColors, shouldUseColor } from "../utils/colors.js";
import { isNodeError, readSourceFile, readStdin } from "../utils/file-io.js";
import { formatFsErrorMessage } from "../utils/format-fs-error.js";
import {
    compileMultiFile,
    compilePipeline,
    EXIT_INTERNAL_ERROR,
    EXIT_IO_ERROR,
    EXIT_SUCCESS,
    isStdinInput,
    STDIN_FILENAME,
} from "./compile.js";

/**
 * Same heuristic as compile.ts — detect non-`@vibefun/std` imports so
 * we only take the multi-file tempdir path when the entry truly needs
 * it. Single-file programs keep their fast stdin-to-node execution.
 */
function hasUserModuleImports(source: string): boolean {
    const importRegex = /^\s*import\b[^"']*["']([^"']+)["']/gm;
    let match;
    while ((match = importRegex.exec(source)) !== null) {
        const path = match[1] ?? "";
        if (path === "@vibefun/std" || path.startsWith("@vibefun/std/")) continue;
        return true;
    }
    return false;
}

/**
 * Options for the run command
 */
export interface RunOptions {
    /** Quiet mode - suppress non-error output */
    readonly quiet?: boolean;
    /** Verbose mode - show timing and statistics */
    readonly verbose?: boolean;
    /** JSON output mode */
    readonly json?: boolean;
    /** Force color output */
    readonly color?: boolean;
    /** Disable color output */
    readonly noColor?: boolean;
}

/**
 * Result of the run function
 */
export interface RunResult {
    /** Exit code */
    readonly exitCode: number;
    /** Output written to stdout (if any) */
    readonly stdout?: string;
    /** Output written to stderr (if any) */
    readonly stderr?: string;
}

/**
 * Compile and run a vibefun source file
 *
 * @param inputPath - Path to the .vf source file, or undefined/"-" to read from stdin
 * @param options - Run options
 * @returns Run result with exit code and output
 */
export function run(inputPath: string | undefined, options: RunOptions = {}): RunResult {
    const useColor = shouldUseColor({
        ...(options.color === true ? { color: true } : {}),
        ...(options.noColor === true ? { noColor: true } : {}),
    });
    const colors = createColors(useColor);
    const fromStdin = isStdinInput(inputPath);
    const filename: string = fromStdin ? STDIN_FILENAME : (inputPath as string);

    // Read source (either from stdin or from the entry file).
    let source: string;
    try {
        if (fromStdin) {
            source = readStdin().content;
        } else {
            source = readSourceFile(filename).content;
        }
    } catch (error) {
        if (isNodeError(error)) {
            return formatFsResult(error, filename, options, colors);
        }
        throw error;
    }

    // Multi-file path: only when the entry file has relative or user-
    // package imports. Single-file and @vibefun/std-only programs keep
    // the fast stdin-to-node path so the run unit/e2e tests around
    // verbose timing remain unchanged.
    if (!fromStdin && hasUserModuleImports(source)) {
        return runMultiFile(filename, options, colors);
    }

    // Compile
    const pipelineResult = compilePipeline(source, filename, options);

    if (pipelineResult.kind === "error") {
        return pipelineResult.result;
    }

    if (pipelineResult.kind === "emit") {
        // --emit ast/typed-ast doesn't make sense for run, but handle gracefully
        return { exitCode: EXIT_SUCCESS, stdout: pipelineResult.output };
    }

    const { code, timer } = pipelineResult;

    // Show verbose timing for compilation phase (before execution)
    let stderr: string | undefined;
    if (options.verbose && !options.quiet) {
        stderr = timer.formatVerbose(filename);
    }

    // Execute the compiled JS by piping it to node --input-type=module.
    // Node resolves imports (e.g. @vibefun/std) from the process cwd, so
    // this stdin path requires the user's shell cwd to have a reachable
    // node_modules — same constraint the spec-validation harness relies on.
    const child = spawnSync("node", ["--input-type=module"], {
        input: code,
        stdio: ["pipe", "inherit", "inherit"],
    });

    const exitCode = child.status ?? EXIT_INTERNAL_ERROR;

    return {
        exitCode,
        ...(stderr ? { stderr } : {}),
    };
}

/**
 * Execute an entry-point `.vf` file along with every transitive module.
 *
 * Compiles all reachable modules via compileMultiFile, drops the emitted
 * JS into a tempdir preserving relative structure, mirrors the workspace's
 * node_modules via a symlink so `@vibefun/std` (and any other workspace
 * deps) resolve, then runs the entry JS via `node`. The tempdir is always
 * cleaned up on exit.
 */
function runMultiFile(inputPath: string, options: RunOptions, colors: ReturnType<typeof createColors>): RunResult {
    // Verify the file exists so we produce a nice FS error rather than
    // deferring to module-loader's internal machinery.
    try {
        readSourceFile(inputPath);
    } catch (error) {
        if (isNodeError(error)) {
            return formatFsResult(error, inputPath, options, colors);
        }
        throw error;
    }

    const compile = compileMultiFile(inputPath, options);
    if (compile.kind === "error") {
        return compile.result;
    }

    // Canonicalize the entry path so it aligns with the module-loader's
    // canonical keys (which are also resolved via realpath). Needed on
    // macOS where /tmp resolves to /private/tmp.
    const entryRealPath = realpathSync(resolve(inputPath));
    const entryDir = dirname(entryRealPath);
    const entryRel = relative(entryDir, entryRealPath).replace(/\.vf$/, ".js");

    const runDir = mkdtempSync(join(tmpdir(), "vibefun-run-"));
    try {
        // Write each emitted module into the tempdir preserving structure.
        for (const [relPath, code] of compile.output.outputs) {
            const absPath = join(runDir, relPath);
            mkdirSync(dirname(absPath), { recursive: true });
            writeFileSync(absPath, code, "utf-8");
        }

        // Symlink the workspace's node_modules so imports like @vibefun/std
        // resolve via the existing pnpm hoisting. Walks up from the entry
        // file's directory (not process.cwd()) so `vibefun run path/to/main.vf`
        // resolves dependencies relative to the project, regardless of where
        // the CLI was launched from.
        const sourceNodeModules = findNearestNodeModules(entryDir);
        if (sourceNodeModules !== null) {
            try {
                symlinkSync(sourceNodeModules, join(runDir, "node_modules"), "dir");
            } catch {
                // Symlink may fail on some platforms; fall through and let
                // Node surface a module-not-found error to the user if the
                // compiled code actually references @vibefun/std.
            }
        }

        const entryAbsPath = join(runDir, entryRel);
        const child = spawnSync("node", [entryAbsPath], {
            stdio: ["inherit", "inherit", "inherit"],
            cwd: runDir,
        });

        const exitCode = child.status ?? EXIT_INTERNAL_ERROR;
        return { exitCode };
    } finally {
        rmSync(runDir, { recursive: true, force: true });
    }
}

/** Walk up from `start` until a `node_modules` directory is found. */
function findNearestNodeModules(start: string): string | null {
    let cur = resolve(start);
    for (;;) {
        const candidate = join(cur, "node_modules");
        try {
            if (statSync(candidate).isDirectory()) return candidate;
        } catch {
            // not found at this level; keep walking
        }
        const parent = dirname(cur);
        if (parent === cur) return null;
        cur = parent;
    }
}

/**
 * Format a file system error for the run command
 */
function formatFsResult(
    error: NodeJS.ErrnoException,
    path: string,
    options: RunOptions,
    colors: ReturnType<typeof createColors>,
): RunResult {
    const message = formatFsErrorMessage(error, path, colors);

    if (options.json) {
        const output = {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                path,
            },
        };
        return { exitCode: EXIT_IO_ERROR, stderr: JSON.stringify(output, null, 2) };
    }

    return { exitCode: EXIT_IO_ERROR, stderr: message };
}
