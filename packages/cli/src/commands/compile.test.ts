/**
 * Integration tests for the compile command
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Timer } from "../utils/timer.js";
import {
    compile,
    compilePipeline,
    EXIT_COMPILATION_ERROR,
    EXIT_IO_ERROR,
    EXIT_SUCCESS,
    formatStdoutSuccessResult,
    isStdinInput,
    STDIN_FILENAME,
} from "./compile.js";

describe("compile command", () => {
    let testDir: string;

    beforeEach(() => {
        // Create a unique test directory
        testDir = join(tmpdir(), `vibefun-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up test directory
        rmSync(testDir, { recursive: true, force: true });
    });

    /**
     * Helper to create a test file
     */
    function createTestFile(name: string, content: string): string {
        const path = join(testDir, name);
        const dir = join(testDir, ...name.split("/").slice(0, -1));
        if (dir !== testDir) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(path, content, "utf-8");
        return path;
    }

    /**
     * Helper to check if output file exists
     */
    function readOutputFile(name: string): string {
        return readFileSync(join(testDir, name), "utf-8");
    }

    describe("basic compilation", () => {
        it("compiles a simple file with default output", () => {
            const inputPath = createTestFile("main.vf", "let x = 42;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            // Check output file exists with default name
            const output = readOutputFile("main.js");
            expect(output).toContain("// Vibefun compiled output");
            expect(output).toContain("export {};");
        });

        it("compiles a file with custom output path", () => {
            const inputPath = createTestFile("src/input.vf", "let y = 100;");

            const outputPath = join(testDir, "dist/output.js");
            const result = compile(inputPath, { output: outputPath, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("dist/output.js");
            expect(output).toContain("export {};");
        });

        it("creates nested directories for output path", () => {
            const inputPath = createTestFile("test.vf", "let z = 0;");

            const outputPath = join(testDir, "deep/nested/dir/out.js");
            const result = compile(inputPath, { output: outputPath, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("deep/nested/dir/out.js");
            expect(output).toContain("export {};");
        });

        it("compiles an empty file to valid empty module", () => {
            const inputPath = createTestFile("empty.vf", "");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("empty.js");
            expect(output).toContain("export {};");
        });

        it("compiles a file with only comments", () => {
            const inputPath = createTestFile("comments.vf", "// This is a comment\n// Another comment");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("comments.js");
            expect(output).toContain("export {};");
        });
    });

    describe("--emit ast", () => {
        it("outputs surface AST as JSON to stdout", () => {
            const inputPath = createTestFile("test.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "ast" });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.filename).toBe(inputPath);
            expect(output.declarationCount).toBe(1);
            expect(output.ast).toBeDefined();
        });

        it("does not write file when --emit ast is used", () => {
            const inputPath = createTestFile("nowrite.vf", "let x = 1;");

            compile(inputPath, { emit: "ast" });

            // Should not create output file
            expect(() => readOutputFile("nowrite.js")).toThrow();
        });
    });

    describe("--emit typed-ast", () => {
        it("outputs typed AST as JSON to stdout", () => {
            const inputPath = createTestFile("typed.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "typed-ast" });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.filename).toBe(inputPath);
            expect(output.declarationCount).toBe(1);
            expect(output.ast).toBeDefined();
            expect(output.types).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("returns exit code 1 for parse errors", () => {
            const inputPath = createTestFile("bad-syntax.vf", "let x =");

            const result = compile(inputPath, { noColor: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("error");
        });

        it("returns exit code 4 for file not found", () => {
            const result = compile(join(testDir, "nonexistent.vf"), { noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("not found");
        });
    });

    describe("--verbose", () => {
        it("shows timing information", () => {
            const inputPath = createTestFile("verbose.vf", "let x = 42;");

            const result = compile(inputPath, { verbose: true, noColor: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();
            expect(result.stdout).toContain("lexer:");
            expect(result.stdout).toContain("parser:");
            expect(result.stdout).toContain("Total:");
        });
    });

    describe("--quiet", () => {
        it("suppresses success output", () => {
            const inputPath = createTestFile("quiet.vf", "let x = 42;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeUndefined();
        });
    });

    describe("--json", () => {
        it("outputs success as JSON", () => {
            const inputPath = createTestFile("json-success.vf", "let x = 42;");

            const result = compile(inputPath, { json: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.success).toBe(true);
            expect(output.diagnostics).toEqual([]);
        });

        it("outputs errors as JSON", () => {
            const inputPath = createTestFile("json-error.vf", "let x =");

            const result = compile(inputPath, { json: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();

            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.diagnostics.length).toBeGreaterThan(0);
        });

        it("includes timing in JSON when --verbose is also used", () => {
            const inputPath = createTestFile("json-verbose.vf", "let x = 42;");

            const result = compile(inputPath, { json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.timing.totalMs).toBeGreaterThanOrEqual(0);
            expect(output.timing.phases).toBeDefined();
        });
    });

    describe("input handling", () => {
        it("handles UTF-8 BOM", () => {
            const bom = "\uFEFF";
            const inputPath = createTestFile("bom.vf", `${bom}let x = 42;`);

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });

        it("handles CRLF line endings", () => {
            const inputPath = createTestFile("crlf.vf", "let x = 42;\r\nlet y = 100;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });
    });

    describe("atomic writes", () => {
        it("does not leave partial output on compilation error", () => {
            const inputPath = createTestFile("fail.vf", "let x =");
            const outputPath = join(testDir, "fail.js");

            compile(inputPath, { output: outputPath });

            // Output file should not exist
            expect(() => readFileSync(outputPath)).toThrow();
        });
    });

    describe("stdin input detection", () => {
        it("treats undefined as stdin", () => {
            expect(isStdinInput(undefined)).toBe(true);
        });

        it('treats "-" as stdin', () => {
            expect(isStdinInput("-")).toBe(true);
        });

        it("treats a file path as non-stdin", () => {
            expect(isStdinInput("main.vf")).toBe(false);
        });

        it("treats empty string as non-stdin", () => {
            expect(isStdinInput("")).toBe(false);
        });
    });

    describe("compilePipeline", () => {
        it("compiles valid source to JS", () => {
            const result = compilePipeline("let x = 42;", "test.vf");

            expect(result.kind).toBe("success");
            if (result.kind === "success") {
                expect(result.code).toContain("const x = 42");
                expect(result.code).toContain("export {};");
            }
        });

        it("returns emit result for --emit ast", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { emit: "ast" });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                const parsed = JSON.parse(result.output);
                expect(parsed.filename).toBe("test.vf");
                expect(parsed.declarationCount).toBe(1);
            }
        });

        it("returns emit result for --emit typed-ast", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { emit: "typed-ast" });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                const parsed = JSON.parse(result.output);
                expect(parsed.types).toBeDefined();
            }
        });

        it("returns error for invalid source", () => {
            const result = compilePipeline("let x =", "test.vf", { noColor: true });

            expect(result.kind).toBe("error");
            if (result.kind === "error") {
                expect(result.result.exitCode).toBe(EXIT_COMPILATION_ERROR);
                expect(result.result.stderr).toContain("error");
            }
        });

        it("uses provided filename in error messages", () => {
            const result = compilePipeline("let x =", STDIN_FILENAME, { noColor: true });

            expect(result.kind).toBe("error");
            if (result.kind === "error") {
                expect(result.result.stderr).toContain(STDIN_FILENAME);
            }
        });
    });

    describe("stdout output (stdin mode)", () => {
        it("outputs JS to stdout when compiling from stdin with no --output", () => {
            // Test via compilePipeline since actual stdin can't be simulated in unit tests
            const pipelineResult = compilePipeline("let x = 42;", STDIN_FILENAME);

            expect(pipelineResult.kind).toBe("success");
            if (pipelineResult.kind === "success") {
                expect(pipelineResult.code).toContain("const x = 42");
            }
        });

        it("writes to file when file input with custom --output path", () => {
            const outputPath = join(testDir, "custom-output.js");
            const inputPath = createTestFile("custom-test.vf", "let x = 42;");

            const result = compile(inputPath, { output: outputPath, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            const output = readOutputFile("custom-output.js");
            expect(output).toContain("export {};");
        });
    });

    describe("verbose error output", () => {
        it("includes timing in verbose error output", () => {
            const inputPath = createTestFile("verbose-error.vf", "let x =");

            const result = compile(inputPath, { verbose: true, noColor: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("lexer:");
            expect(result.stderr).toContain("error");
        });

        it("includes timing in verbose JSON error output", () => {
            const inputPath = createTestFile("verbose-json-error.vf", "let x =");

            const result = compile(inputPath, { verbose: true, json: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.timing).toBeDefined();
        });
    });

    describe("compilePipeline verbose and json", () => {
        it("includes timing in verbose ast emit", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { emit: "ast", verbose: true });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                expect(result.output).toContain("lexer:");
            }
        });

        it("includes timing in verbose typed-ast emit", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { emit: "typed-ast", verbose: true });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                expect(result.output).toContain("lexer:");
            }
        });

        it("formats JSON error with verbose timing", () => {
            const result = compilePipeline("let x =", "test.vf", { json: true, verbose: true });

            expect(result.kind).toBe("error");
            if (result.kind === "error") {
                const output = JSON.parse(result.result.stderr!);
                expect(output.timing).toBeDefined();
            }
        });

        it("includes verbose timing in success code generation", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { verbose: true });

            expect(result.kind).toBe("success");
            if (result.kind === "success") {
                expect(result.timer).toBeDefined();
            }
        });

        it("includes json timing in ast emit", () => {
            const result = compilePipeline("let x = 42;", "test.vf", { emit: "ast", json: true, verbose: true });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                const parsed = JSON.parse(result.output);
                expect(parsed.timing).toBeDefined();
            }
        });

        it("includes json timing in typed-ast emit", () => {
            const result = compilePipeline("let x = 42;", "test.vf", {
                emit: "typed-ast",
                json: true,
                verbose: true,
            });

            expect(result.kind).toBe("emit");
            if (result.kind === "emit") {
                const parsed = JSON.parse(result.output);
                expect(parsed.timing).toBeDefined();
            }
        });

        it("returns error for json errors without verbose", () => {
            const result = compilePipeline("let x =", "test.vf", { json: true });

            expect(result.kind).toBe("error");
            if (result.kind === "error") {
                const output = JSON.parse(result.result.stderr!);
                expect(output.success).toBe(false);
                expect(output.timing).toBeUndefined();
            }
        });
    });

    describe("write error handling", () => {
        it("returns IO error when output directory is a file", () => {
            const inputPath = createTestFile("write-fail.vf", "let x = 42;");
            // Create a file where a directory would be needed
            const blockerPath = join(testDir, "blocker");
            writeFileSync(blockerPath, "not a dir");
            const outputPath = join(blockerPath, "out.js");

            const result = compile(inputPath, { output: outputPath, noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
        });

        it("returns IO error as JSON for write failures", () => {
            const inputPath = createTestFile("write-fail-json.vf", "let x = 42;");
            const blockerPath = join(testDir, "blocker2");
            writeFileSync(blockerPath, "not a dir");
            const outputPath = join(blockerPath, "out.js");

            const result = compile(inputPath, { output: outputPath, json: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.error).toBeDefined();
        });
    });

    describe("file read error handling", () => {
        it("returns IO error as JSON for file not found", () => {
            const result = compile(join(testDir, "missing.vf"), { json: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.error.code).toBe("ENOENT");
        });

        it("returns IO error for directory instead of file", () => {
            mkdirSync(join(testDir, "adir.vf"), { recursive: true });

            const result = compile(join(testDir, "adir.vf"), { noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toContain("directory");
        });

        it("returns IO error as JSON for directory instead of file", () => {
            mkdirSync(join(testDir, "adir2.vf"), { recursive: true });

            const result = compile(join(testDir, "adir2.vf"), { json: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
        });
    });

    describe("formatStdoutSuccessResult", () => {
        it("returns compiled code on stdout", () => {
            const timer = new Timer();
            const result = formatStdoutSuccessResult("const x = 42;", STDIN_FILENAME, {}, timer);

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBe("const x = 42;");
        });

        it("includes code in JSON output", () => {
            const timer = new Timer();
            const result = formatStdoutSuccessResult("const x = 42;", STDIN_FILENAME, { json: true }, timer);

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            const output = JSON.parse(result.stdout!);
            expect(output.success).toBe(true);
            expect(output.code).toBe("const x = 42;");
        });

        it("includes timing in JSON verbose output", () => {
            const timer = new Timer();
            timer.start("test");
            timer.stop();
            const result = formatStdoutSuccessResult(
                "const x = 42;",
                STDIN_FILENAME,
                { json: true, verbose: true },
                timer,
            );

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.code).toBe("const x = 42;");
        });

        it("sends timing to stderr in verbose mode", () => {
            const timer = new Timer();
            timer.start("test");
            timer.stop();
            const result = formatStdoutSuccessResult("const x = 42;", STDIN_FILENAME, { verbose: true }, timer);

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBe("const x = 42;");
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("Total:");
        });

        it("does not send timing in verbose+quiet mode", () => {
            const timer = new Timer();
            timer.start("test");
            timer.stop();
            const result = formatStdoutSuccessResult(
                "const x = 42;",
                STDIN_FILENAME,
                { verbose: true, quiet: true },
                timer,
            );

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBe("const x = 42;");
            expect(result.stderr).toBeUndefined();
        });
    });

    describe("--emit with --verbose --json", () => {
        it("includes timing in ast JSON output", () => {
            const inputPath = createTestFile("ast-timing.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "ast", json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.filename).toBeDefined();
        });

        it("includes timing in typed-ast JSON output", () => {
            const inputPath = createTestFile("typed-ast-timing.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "typed-ast", json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.filename).toBeDefined();
        });
    });

    describe("multi-file compilation", () => {
        it("emits one .js per .vf when the entry has a relative import", () => {
            createTestFile("lib.vf", "export let x = 3;");
            const entryPath = createTestFile("main.vf", 'import { x } from "./lib";\nlet result = x;');

            const result = compile(entryPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(readOutputFile("main.js")).toContain("result");
            expect(readOutputFile("lib.js")).toContain("export");
        });

        it("reports the multi-file summary when quiet is not set", () => {
            createTestFile("lib.vf", "export let x = 3;");
            const entryPath = createTestFile("main.vf", 'import { x } from "./lib";\nlet result = x;');

            const result = compile(entryPath, {});

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toMatch(/Compiled/);
            expect(result.stdout).toMatch(/additional module/);
        });

        it("stays on the single-file path for @vibefun/std-only imports", () => {
            const entryPath = createTestFile(
                "single.vf",
                'import { String } from "@vibefun/std";\nlet _ = String.fromInt(1);',
            );

            const result = compile(entryPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            // Only one .js emitted next to the entry.
            expect(() => readOutputFile("single.js")).not.toThrow();
        });

        it("stays on the single-file path when --emit ast is requested", () => {
            createTestFile("lib.vf", "export let x = 3;");
            const entryPath = createTestFile("main.vf", 'import { x } from "./lib";\nlet _ = x;');

            const result = compile(entryPath, { emit: "ast" });

            // --emit ast forces the single-file path (no cross-module
            // resolution). Output is the entry file's AST as JSON, not
            // a multi-file summary and not sibling .js files.
            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toMatch(/SurfaceModule|declarations/);
            expect(() => readOutputFile("lib.js")).toThrow();
        });

        it("surfaces compilation errors from any module in the graph", () => {
            createTestFile("lib.vf", "export let x = broken_ref;");
            const entryPath = createTestFile("main.vf", 'import { x } from "./lib";\nlet _ = x;');

            const result = compile(entryPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
        });

        it("rewrites import paths when an import resolves to a directory's index.vf", () => {
            // Per spec docs/spec/08-modules.md "Index file convention":
            // `./lib` resolves to `./lib/index.vf` if `./lib.vf` doesn't
            // exist. Codegen would otherwise emit `./lib.js` (which
            // doesn't exist on disk); the post-pass rewrites it to
            // `./lib/index.js` so the runtime can find it.
            createTestFile("lib/index.vf", "export let x = 99;");
            const entryPath = createTestFile("main.vf", 'import { x } from "./lib";\nlet _ = x;');

            const result = compile(entryPath, { quiet: true });
            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const mainJs = readOutputFile("main.js");
            expect(mainJs).toContain('from "./lib/index.js"');
            expect(mainJs).not.toContain('from "./lib.js"');
        });

        it("triggers multi-file mode for re-export-only entry modules", () => {
            // Regression: `hasUserModuleImports` previously only matched
            // `import` statements, so an entry that only re-exported
            // (`export { x } from "./lib";`) skipped multi-file mode and
            // the sibling .vf wasn't compiled / written.
            createTestFile("lib.vf", "export let x = 11;");
            const entryPath = createTestFile("main.vf", 'export { x } from "./lib";');

            const result = compile(entryPath, { quiet: true });
            expect(result.exitCode).toBe(EXIT_SUCCESS);

            // Both modules must have been emitted.
            expect(() => readOutputFile("main.js")).not.toThrow();
            expect(() => readOutputFile("lib.js")).not.toThrow();

            const mainJs = readOutputFile("main.js");
            expect(mainJs).toContain('from "./lib.js"');
        });

        it("leaves direct file imports untouched when no rewrite is needed", () => {
            createTestFile("lib.vf", "export let z = 1;");
            const entryPath = createTestFile("main.vf", 'import { z } from "./lib";\nlet _ = z;');

            const result = compile(entryPath, { quiet: true });
            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const mainJs = readOutputFile("main.js");
            expect(mainJs).toContain('from "./lib.js"');
        });
    });
});
