/**
 * Compile command implementation
 *
 * Runs the full compilation pipeline:
 * lexer → parser → desugarer → typechecker → codegen
 */

import { basename, dirname, join } from "node:path";
import { desugarModule, generate, Lexer, Parser, typeCheck, VibefunDiagnostic } from "@vibefun/core";

import { countNodes, serializeSurfaceAst, serializeTypedAst } from "../output/ast-json.js";
import { formatDiagnosticHuman, formatDiagnosticsJson, formatSuccessJson } from "../output/diagnostic.js";
import { createColors, shouldUseColor } from "../utils/colors.js";
import { isNodeError, readSourceFile, writeAtomic } from "../utils/file-io.js";
import { Timer } from "../utils/timer.js";

/**
 * Emit types for --emit option
 */
export type EmitType = "js" | "ast" | "typed-ast";

/**
 * Options for the compile command
 */
export interface CompileOptions {
    /** Output file path */
    readonly output?: string;
    /** Emit type: js, ast, or typed-ast */
    readonly emit?: EmitType;
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
 * Exit codes as defined in cli-mvp.md
 */
export const EXIT_SUCCESS = 0;
export const EXIT_COMPILATION_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;
export const EXIT_IO_ERROR = 4;
export const EXIT_INTERNAL_ERROR = 5;

/**
 * Result of the compile function
 */
export interface CompileResult {
    /** Exit code */
    readonly exitCode: number;
    /** Output written to stdout (if any) */
    readonly stdout?: string;
    /** Output written to stderr (if any) */
    readonly stderr?: string;
}

/**
 * Compile a vibefun source file
 *
 * @param inputPath - Path to the .vf source file
 * @param options - Compile options
 * @returns Compile result with exit code and output
 */
export function compile(inputPath: string, options: CompileOptions = {}): CompileResult {
    const timer = new Timer();
    const useColor = shouldUseColor({
        ...(options.color === true ? { color: true } : {}),
        ...(options.noColor === true ? { noColor: true } : {}),
    });
    const colors = createColors(useColor);

    let source = "";
    let diagnostics: VibefunDiagnostic[] = [];

    try {
        // Read source file
        timer.start("read");
        const readResult = readSourceFile(inputPath);
        source = readResult.content;
        timer.stop();

        // Lexer
        timer.start("lexer");
        const lexer = new Lexer(source, inputPath);
        const tokens = lexer.tokenize();
        timer.addMetadata("tokens", tokens.length);
        timer.stop();

        // Parser
        timer.start("parser");
        const parser = new Parser(tokens, inputPath);
        const ast = parser.parse();
        timer.addMetadata("nodes", countNodes(ast));
        timer.stop();

        // Handle --emit ast (surface AST, before desugaring)
        if (options.emit === "ast") {
            const output = serializeSurfaceAst(ast, inputPath);
            timer.stop();

            if (options.json && options.verbose) {
                // Combine AST output with timing
                const timings = timer.getTimings();
                const combined = {
                    ...JSON.parse(output),
                    timing: {
                        totalMs: timings.totalMs,
                        phases: timings.phases.map((p) => ({
                            name: p.name,
                            durationMs: p.durationMs,
                            ...(p.metadata ? { metadata: p.metadata } : {}),
                        })),
                    },
                };
                return { exitCode: EXIT_SUCCESS, stdout: JSON.stringify(combined, null, 2) };
            }

            if (options.verbose && !options.quiet) {
                return {
                    exitCode: EXIT_SUCCESS,
                    stdout: output,
                    stderr: timer.formatVerbose(inputPath),
                };
            }

            return { exitCode: EXIT_SUCCESS, stdout: output };
        }

        // Desugarer
        timer.start("desugar");
        const coreAst = desugarModule(ast);
        timer.stop();

        // TypeChecker
        timer.start("typecheck");
        const typedModule = typeCheck(coreAst);
        timer.stop();

        // Handle --emit typed-ast
        if (options.emit === "typed-ast") {
            const output = serializeTypedAst(typedModule, inputPath);
            timer.stop();

            if (options.json && options.verbose) {
                const timings = timer.getTimings();
                const combined = {
                    ...JSON.parse(output),
                    timing: {
                        totalMs: timings.totalMs,
                        phases: timings.phases.map((p) => ({
                            name: p.name,
                            durationMs: p.durationMs,
                            ...(p.metadata ? { metadata: p.metadata } : {}),
                        })),
                    },
                };
                return { exitCode: EXIT_SUCCESS, stdout: JSON.stringify(combined, null, 2) };
            }

            if (options.verbose && !options.quiet) {
                return {
                    exitCode: EXIT_SUCCESS,
                    stdout: output,
                    stderr: timer.formatVerbose(inputPath),
                };
            }

            return { exitCode: EXIT_SUCCESS, stdout: output };
        }

        // Code Generator (default: --emit js)
        timer.start("codegen");
        const { code } = generate(typedModule, { filename: inputPath });
        timer.addMetadata("bytes", code.length);
        timer.setOutputBytes(code.length);
        timer.stop();

        // Determine output path
        const outputPath = options.output ?? getDefaultOutputPath(inputPath);

        // Write output atomically
        timer.start("write");
        writeAtomic(outputPath, code);
        timer.stop();

        // Format success output
        return formatSuccessResult(inputPath, outputPath, options, timer, colors);
    } catch (error) {
        // Handle different error types
        if (error instanceof VibefunDiagnostic) {
            diagnostics = [error];
            return formatErrorResult(diagnostics, source, options, timer, colors);
        }

        if (isNodeError(error)) {
            // File system error
            const message = formatFsError(error, inputPath, colors);
            if (options.json) {
                const output = {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        path: inputPath,
                    },
                    ...(options.verbose ? { timing: timer.toJSON() } : {}),
                };
                return { exitCode: EXIT_IO_ERROR, stderr: JSON.stringify(output, null, 2) };
            }
            return { exitCode: EXIT_IO_ERROR, stderr: message };
        }

        // Internal error (unexpected)
        const message =
            error instanceof Error ? `Internal error: ${error.message}` : `Internal error: ${String(error)}`;

        if (options.json) {
            const output = {
                success: false,
                error: {
                    code: "INTERNAL",
                    message,
                },
                ...(options.verbose ? { timing: timer.toJSON() } : {}),
            };
            return { exitCode: EXIT_INTERNAL_ERROR, stderr: JSON.stringify(output, null, 2) };
        }

        return { exitCode: EXIT_INTERNAL_ERROR, stderr: colors.red(message) };
    }
}

/**
 * Get default output path from input path
 * e.g., "src/main.vf" → "src/main.js"
 */
function getDefaultOutputPath(inputPath: string): string {
    const dir = dirname(inputPath);
    const base = basename(inputPath, ".vf");
    return join(dir, `${base}.js`);
}

/**
 * Format a successful compilation result
 */
function formatSuccessResult(
    inputPath: string,
    outputPath: string,
    options: CompileOptions,
    timer: Timer,
    colors: ReturnType<typeof createColors>,
): CompileResult {
    if (options.json) {
        const timings = options.verbose ? timer.getTimings() : undefined;
        const output = formatSuccessJson(outputPath, timings);
        return { exitCode: EXIT_SUCCESS, stdout: output };
    }

    if (options.quiet) {
        return { exitCode: EXIT_SUCCESS };
    }

    const lines: string[] = [];

    if (options.verbose) {
        lines.push(timer.formatVerbose(inputPath));
        lines.push("");
    }

    lines.push(`${colors.cyan("✓")} Compiled ${inputPath} → ${outputPath}`);

    return { exitCode: EXIT_SUCCESS, stdout: lines.join("\n") };
}

/**
 * Format an error result
 */
function formatErrorResult(
    diagnostics: VibefunDiagnostic[],
    source: string,
    options: CompileOptions,
    timer: Timer,
    colors: ReturnType<typeof createColors>,
): CompileResult {
    if (options.json) {
        const timings = options.verbose ? timer.getTimings() : undefined;
        const output = formatDiagnosticsJson(diagnostics, timings);
        return { exitCode: EXIT_COMPILATION_ERROR, stderr: output };
    }

    const errorMessages = diagnostics.map((d) => formatDiagnosticHuman(d, source, colors)).join("\n\n");

    if (options.verbose && !options.quiet) {
        const verboseOutput = timer.formatVerbose(diagnostics[0]?.location.file ?? "unknown");
        return {
            exitCode: EXIT_COMPILATION_ERROR,
            stderr: `${verboseOutput}\n\n${errorMessages}`,
        };
    }

    return { exitCode: EXIT_COMPILATION_ERROR, stderr: errorMessages };
}

/**
 * Format a file system error message
 */
function formatFsError(error: NodeJS.ErrnoException, path: string, colors: ReturnType<typeof createColors>): string {
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
