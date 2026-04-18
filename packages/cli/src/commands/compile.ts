/**
 * Compile command implementation
 *
 * Runs the full compilation pipeline:
 * lexer → parser → desugarer → typechecker → codegen
 */

import { realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
    desugarModule,
    generate,
    Lexer,
    loadAndResolveModules,
    Parser,
    typeCheck,
    VibefunDiagnostic,
} from "@vibefun/core";

import { countNodes, serializeSurfaceAst, serializeTypedAst } from "../output/ast-json.js";
import { formatDiagnosticHuman, formatDiagnosticsJson, formatSuccessJson } from "../output/diagnostic.js";
import { createColors, shouldUseColor } from "../utils/colors.js";
import { isNodeError, readSourceFile, readStdin, writeAtomic } from "../utils/file-io.js";
import { formatFsErrorMessage } from "../utils/format-fs-error.js";
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
 * Synthetic filename used when reading from stdin
 */
export const STDIN_FILENAME = "<stdin>";

/**
 * Check if the input should be read from stdin
 */
export function isStdinInput(inputPath: string | undefined): boolean {
    return inputPath === undefined || inputPath === "-";
}

/**
 * Result of the compilation pipeline (no I/O)
 */
export interface PipelineSuccess {
    readonly kind: "success";
    readonly code: string;
    readonly timer: Timer;
}

export interface PipelineEmit {
    readonly kind: "emit";
    readonly output: string;
    readonly timer: Timer;
}

export interface PipelineError {
    readonly kind: "error";
    readonly result: CompileResult;
}

export type PipelineResult = PipelineSuccess | PipelineEmit | PipelineError;

/**
 * Per-module output from a multi-file compile. Keyed by the module's entry-
 * relative output path (e.g. `main.js`, `utils/helpers.js`).
 */
export interface MultiFileOutput {
    readonly outputs: Map<string, string>;
    readonly warnings: readonly VibefunDiagnostic[];
}

export interface MultiFileSuccess {
    readonly kind: "success";
    readonly output: MultiFileOutput;
}

export interface MultiFileError {
    readonly kind: "error";
    readonly result: CompileResult;
}

export type MultiFileResult = MultiFileSuccess | MultiFileError;

/**
 * Run the compilation pipeline on source code without performing any I/O.
 *
 * Returns the compiled JS code, an AST emit result, or an error.
 * Used by both the compile and run commands.
 *
 * @param source - Source code to compile
 * @param filename - Filename for error reporting
 * @param options - Compile options (emit, verbose, json, quiet, color, noColor)
 */
export function compilePipeline(source: string, filename: string, options: CompileOptions = {}): PipelineResult {
    const timer = new Timer();
    const useColor = shouldUseColor({
        ...(options.color === true ? { color: true } : {}),
        ...(options.noColor === true ? { noColor: true } : {}),
    });
    const colors = createColors(useColor);

    try {
        // Lexer
        timer.start("lexer");
        const lexer = new Lexer(source, filename);
        const tokens = lexer.tokenize();
        timer.addMetadata("tokens", tokens.length);
        timer.stop();

        // Parser
        timer.start("parser");
        const parser = new Parser(tokens, filename);
        const ast = parser.parse();
        timer.addMetadata("nodes", countNodes(ast));
        timer.stop();

        // Handle --emit ast (surface AST, before desugaring)
        if (options.emit === "ast") {
            const output = serializeSurfaceAst(ast, filename);
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
                return {
                    kind: "emit",
                    output: JSON.stringify(combined, null, 2),
                    timer,
                };
            }

            if (options.verbose && !options.quiet) {
                return {
                    kind: "emit",
                    output: `${output}\n${timer.formatVerbose(filename)}`,
                    timer,
                };
            }

            return { kind: "emit", output, timer };
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
            const output = serializeTypedAst(typedModule, filename);
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
                return {
                    kind: "emit",
                    output: JSON.stringify(combined, null, 2),
                    timer,
                };
            }

            if (options.verbose && !options.quiet) {
                return {
                    kind: "emit",
                    output: `${output}\n${timer.formatVerbose(filename)}`,
                    timer,
                };
            }

            return { kind: "emit", output, timer };
        }

        // Code Generator (default: --emit js)
        timer.start("codegen");
        const { code } = generate(typedModule, { filename });
        timer.addMetadata("bytes", code.length);
        timer.setOutputBytes(code.length);
        timer.stop();

        return { kind: "success", code, timer };
    } catch (error) {
        if (error instanceof VibefunDiagnostic) {
            const diagnostics = [error];
            return { kind: "error", result: formatErrorResult(diagnostics, source, options, timer, colors) };
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
            return {
                kind: "error",
                result: { exitCode: EXIT_INTERNAL_ERROR, stderr: JSON.stringify(output, null, 2) },
            };
        }

        return {
            kind: "error",
            result: { exitCode: EXIT_INTERNAL_ERROR, stderr: colors.red(message) },
        };
    }
}

/**
 * Compile every module reachable from `entryPath` into per-module JS code.
 *
 * Wraps `loadAndResolveModules` so callers don't have to manage the graph,
 * and returns a map of entry-relative output paths to generated JS.
 *
 * Scope: surfaces loader / resolver errors as a regular CompileResult so
 * callers can forward the exit code. AST emit modes (`--emit ast`,
 * `--emit typed-ast`) are not supported here — those are single-file
 * concepts. Use compilePipeline for stdin / single-file modes.
 */
export function compileMultiFile(entryPath: string, options: CompileOptions = {}): MultiFileResult {
    const useColor = shouldUseColor({
        ...(options.color === true ? { color: true } : {}),
        ...(options.noColor === true ? { noColor: true } : {}),
    });
    const colors = createColors(useColor);

    let resolution;
    try {
        resolution = loadAndResolveModules(entryPath);
    } catch (error) {
        if (error instanceof VibefunDiagnostic) {
            const timer = new Timer();
            return {
                kind: "error",
                result: formatErrorResult([error], "", options, timer, colors),
            };
        }
        throw error;
    }

    if (resolution.errors.length > 0) {
        const timer = new Timer();
        return {
            kind: "error",
            result: formatErrorResult(resolution.errors, "", options, timer, colors),
        };
    }

    // Canonicalize via realpath so the entry directory lines up with the
    // module-loader's canonical path keys — without this, the /tmp →
    // /private/tmp symlink on macOS causes relative() to escape the entry
    // directory with leading `..` segments.
    const entryRealPath = realpathSync(resolve(entryPath));
    const entryDir = dirname(entryRealPath);
    const outputs = new Map<string, string>();

    try {
        for (const modulePath of resolution.compilationOrder) {
            const surfaceModule = resolution.modules.get(modulePath);
            if (surfaceModule === undefined) continue;

            const coreAst = desugarModule(surfaceModule);
            const typedModule = typeCheck(coreAst);
            const { code } = generate(typedModule, { filename: modulePath });

            const relativePath = relative(entryDir, modulePath);
            const outputRelative = relativePath.endsWith(".vf")
                ? relativePath.slice(0, -".vf".length) + ".js"
                : relativePath + ".js";
            outputs.set(outputRelative, code);
        }
    } catch (error) {
        if (error instanceof VibefunDiagnostic) {
            const timer = new Timer();
            return {
                kind: "error",
                result: formatErrorResult([error], "", options, timer, colors),
            };
        }
        throw error;
    }

    return {
        kind: "success",
        output: { outputs, warnings: resolution.warnings },
    };
}

/**
 * Heuristic: does the source contain any `import … from "path"` where
 * the path is either relative (starts with `./` or `../`) or a non-
 * `@vibefun/std` package? A full parse would be more accurate, but a
 * regex keeps the single-file fast path cheap.
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
 * Wrapper around compileMultiFile that writes each per-module JS file
 * to disk next to its source `.vf` file and returns a CompileResult.
 * Shared by the `compile` and `run` commands.
 */
function compileMultiFileFromEntry(
    entryPath: string,
    options: CompileOptions,
    colors: ReturnType<typeof createColors>,
): CompileResult {
    const result = compileMultiFile(entryPath, options);
    if (result.kind === "error") return result.result;

    const entryRealPath = realpathSync(resolve(entryPath));
    const entryDir = dirname(entryRealPath);
    for (const [relPath, code] of result.output.outputs) {
        const outPath = join(entryDir, relPath);
        try {
            writeAtomic(outPath, code);
        } catch (error) {
            if (isNodeError(error)) {
                const message = formatFsErrorMessage(error, outPath, colors);
                return { exitCode: EXIT_IO_ERROR, stderr: message };
            }
            throw error;
        }
    }

    if (options.quiet) return { exitCode: EXIT_SUCCESS };

    const mainOutPath = join(entryDir, relative(entryDir, entryRealPath).replace(/\.vf$/, ".js"));
    const lines: string[] = [`${colors.cyan("✓")} Compiled ${entryPath} → ${mainOutPath}`];
    if (result.output.outputs.size > 1) {
        lines.push(`  (${result.output.outputs.size - 1} additional module(s) written alongside)`);
    }
    if (result.output.warnings.length > 0) {
        for (const warning of result.output.warnings) {
            lines.push(colors.yellow(warning.format()));
        }
    }
    return { exitCode: EXIT_SUCCESS, stdout: lines.join("\n") };
}

/**
 * Compile a vibefun source file
 *
 * @param inputPath - Path to the .vf source file, or undefined/"-" to read from stdin
 * @param options - Compile options
 * @returns Compile result with exit code and output
 */
export function compile(inputPath: string | undefined, options: CompileOptions = {}): CompileResult {
    const useColor = shouldUseColor({
        ...(options.color === true ? { color: true } : {}),
        ...(options.noColor === true ? { noColor: true } : {}),
    });
    const colors = createColors(useColor);
    const fromStdin = isStdinInput(inputPath);
    // When fromStdin is false, inputPath is guaranteed to be a string
    // because isStdinInput() only returns false when inputPath is a non-"-" string
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
            const message = formatFsErrorMessage(error, filename, colors);
            if (options.json) {
                const output = {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        path: filename,
                    },
                };
                return { exitCode: EXIT_IO_ERROR, stderr: JSON.stringify(output, null, 2) };
            }
            return { exitCode: EXIT_IO_ERROR, stderr: message };
        }
        throw error;
    }

    // Multi-file path: only when the entry file has relative or user-
    // package imports. Single-file and @vibefun/std-only programs stay on
    // the original single-file path so the compile unit tests around
    // custom --output, JSON output, verbose timing, and IO errors keep
    // their existing behaviour. AST / typed-AST emit modes always stay
    // single-file; they operate on one module at a time.
    if (
        !fromStdin &&
        !options.output &&
        (options.emit === undefined || options.emit === "js") &&
        hasUserModuleImports(source)
    ) {
        return compileMultiFileFromEntry(filename, options, colors);
    }

    // Run compilation pipeline
    const pipelineResult = compilePipeline(source, filename, options);

    if (pipelineResult.kind === "error") {
        return pipelineResult.result;
    }

    if (pipelineResult.kind === "emit") {
        // --emit ast or --emit typed-ast: output goes to stdout
        return { exitCode: EXIT_SUCCESS, stdout: pipelineResult.output };
    }

    // --emit js (default): write to file or stdout
    const { code, timer } = pipelineResult;

    // If output path specified, or input is from a file with no explicit output -> write to file
    if (options.output || !fromStdin) {
        const outputPath = options.output ?? getDefaultOutputPath(filename);

        try {
            timer.start("write");
            writeAtomic(outputPath, code);
            timer.stop();
        } catch (error) {
            if (isNodeError(error)) {
                const message = formatFsErrorMessage(error, outputPath, colors);
                if (options.json) {
                    const output = {
                        success: false,
                        error: {
                            code: error.code,
                            message: error.message,
                            path: outputPath,
                        },
                    };
                    return { exitCode: EXIT_IO_ERROR, stderr: JSON.stringify(output, null, 2) };
                }
                return { exitCode: EXIT_IO_ERROR, stderr: message };
            }
            throw error;
        }

        return formatFileSuccessResult(filename, outputPath, options, timer, colors);
    }

    // stdin with no --output: emit JS to stdout
    return formatStdoutSuccessResult(code, filename, options, timer);
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
 * Format a successful compilation result when output was written to a file
 */
function formatFileSuccessResult(
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
 * Format a successful compilation result when output goes to stdout
 */
export function formatStdoutSuccessResult(
    code: string,
    filename: string,
    options: CompileOptions,
    timer: Timer,
): CompileResult {
    if (options.json) {
        const timings = options.verbose ? timer.getTimings() : undefined;
        const output = formatSuccessJson(undefined, timings);
        // For JSON mode with stdout output, include the code in the JSON
        const parsed = JSON.parse(output);
        parsed.code = code;
        return { exitCode: EXIT_SUCCESS, stdout: JSON.stringify(parsed, null, 2) };
    }

    // Output JS to stdout, timing info to stderr
    if (options.verbose && !options.quiet) {
        return {
            exitCode: EXIT_SUCCESS,
            stdout: code,
            stderr: timer.formatVerbose(filename),
        };
    }

    return { exitCode: EXIT_SUCCESS, stdout: code };
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
