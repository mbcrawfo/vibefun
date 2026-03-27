/**
 * Run command implementation
 *
 * Compiles a .vf file and executes the resulting JavaScript.
 * The compiled JS is piped to `node --input-type=module` via stdin.
 */

import { spawnSync } from "node:child_process";

import { createColors, shouldUseColor } from "../utils/colors.js";
import { isNodeError, readSourceFile, readStdin } from "../utils/file-io.js";
import {
    compilePipeline,
    EXIT_INTERNAL_ERROR,
    EXIT_IO_ERROR,
    EXIT_SUCCESS,
    isStdinInput,
    STDIN_FILENAME,
} from "./compile.js";

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

    // Read source
    let source: string;
    try {
        if (fromStdin) {
            source = readStdin().content;
        } else {
            source = readSourceFile(filename).content;
        }
    } catch (error) {
        if (isNodeError(error)) {
            return formatFsError(error, filename, options, colors);
        }
        throw error;
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

    // Execute the compiled JS by piping it to node --input-type=module
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
 * Format a file system error for the run command
 */
function formatFsError(
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

/**
 * Format a file system error message
 */
function formatFsErrorMessage(
    error: NodeJS.ErrnoException,
    path: string,
    colors: ReturnType<typeof createColors>,
): string {
    switch (error.code) {
        case "ENOENT":
            return colors.red(`error: File not found: ${path}`);
        case "EACCES":
            return colors.red(`error: Permission denied: ${path}`);
        case "EISDIR":
            return colors.red(`error: Expected file, got directory: ${path}`);
        default:
            return colors.red(`error: ${error.message}`);
    }
}
