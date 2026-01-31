import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isNodeError, normalizeLineEndings, readSourceFile, stripBom, writeAtomic } from "./file-io.js";

describe("stripBom", () => {
    it("should strip UTF-8 BOM", () => {
        const withBom = "\uFEFFhello world";
        expect(stripBom(withBom)).toBe("hello world");
    });

    it("should return content unchanged if no BOM", () => {
        const noBom = "hello world";
        expect(stripBom(noBom)).toBe("hello world");
    });

    it("should handle empty string", () => {
        expect(stripBom("")).toBe("");
    });

    it("should only strip BOM at start", () => {
        const bomInMiddle = "hello\uFEFFworld";
        expect(stripBom(bomInMiddle)).toBe("hello\uFEFFworld");
    });
});

describe("normalizeLineEndings", () => {
    it("should convert CRLF to LF", () => {
        const crlf = "line1\r\nline2\r\nline3";
        expect(normalizeLineEndings(crlf)).toBe("line1\nline2\nline3");
    });

    it("should convert standalone CR to LF", () => {
        const cr = "line1\rline2\rline3";
        expect(normalizeLineEndings(cr)).toBe("line1\nline2\nline3");
    });

    it("should leave LF unchanged", () => {
        const lf = "line1\nline2\nline3";
        expect(normalizeLineEndings(lf)).toBe("line1\nline2\nline3");
    });

    it("should handle mixed line endings", () => {
        const mixed = "line1\r\nline2\rline3\nline4";
        expect(normalizeLineEndings(mixed)).toBe("line1\nline2\nline3\nline4");
    });

    it("should handle empty string", () => {
        expect(normalizeLineEndings("")).toBe("");
    });
});

describe("readSourceFile", () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `vibefun-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    it("should read file content", () => {
        const filePath = join(testDir, "test.vf");
        writeFileSync(filePath, "let x = 42", "utf-8");

        const result = readSourceFile(filePath);
        expect(result.content).toBe("let x = 42");
        expect(result.hadBom).toBe(false);
    });

    it("should strip BOM and report it", () => {
        const filePath = join(testDir, "bom.vf");
        writeFileSync(filePath, "\uFEFFlet x = 42", "utf-8");

        const result = readSourceFile(filePath);
        expect(result.content).toBe("let x = 42");
        expect(result.hadBom).toBe(true);
    });

    it("should normalize line endings", () => {
        const filePath = join(testDir, "crlf.vf");
        writeFileSync(filePath, "line1\r\nline2", "utf-8");

        const result = readSourceFile(filePath);
        expect(result.content).toBe("line1\nline2");
    });

    it("should throw on non-existent file", () => {
        const filePath = join(testDir, "nonexistent.vf");

        expect(() => readSourceFile(filePath)).toThrow();
        try {
            readSourceFile(filePath);
        } catch (error) {
            expect(isNodeError(error)).toBe(true);
            if (isNodeError(error)) {
                expect(error.code).toBe("ENOENT");
            }
        }
    });
});

describe("writeAtomic", () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `vibefun-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    it("should write file content", () => {
        const filePath = join(testDir, "output.js");
        writeAtomic(filePath, "export const x = 42;");

        expect(readFileSync(filePath, "utf-8")).toBe("export const x = 42;");
    });

    it("should create parent directories", () => {
        const filePath = join(testDir, "nested", "deep", "output.js");
        writeAtomic(filePath, "export {};");

        expect(existsSync(filePath)).toBe(true);
        expect(readFileSync(filePath, "utf-8")).toBe("export {};");
    });

    it("should overwrite existing file", () => {
        const filePath = join(testDir, "existing.js");
        writeFileSync(filePath, "old content", "utf-8");

        writeAtomic(filePath, "new content");

        expect(readFileSync(filePath, "utf-8")).toBe("new content");
    });

    it("should not leave temp files on success", () => {
        const filePath = join(testDir, "clean.js");
        writeAtomic(filePath, "content");

        const files = readdirSync(testDir);
        const tempFiles = files.filter((f: string) => f.startsWith(".vibefun-"));
        expect(tempFiles).toHaveLength(0);
    });
});

describe("isNodeError", () => {
    it("should return true for Node.js errors with code", () => {
        try {
            readFileSync("/nonexistent/path/file.txt");
        } catch (error) {
            expect(isNodeError(error)).toBe(true);
        }
    });

    it("should return false for regular errors", () => {
        const error = new Error("regular error");
        expect(isNodeError(error)).toBe(false);
    });

    it("should return false for non-errors", () => {
        expect(isNodeError("string")).toBe(false);
        expect(isNodeError(null)).toBe(false);
        expect(isNodeError(undefined)).toBe(false);
        expect(isNodeError({})).toBe(false);
    });
});
