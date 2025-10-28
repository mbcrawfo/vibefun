/**
 * Tests for error handling utilities
 */

import { describe, expect, it } from "vitest";

import { LexerError, ParserError, TypeError, VibefunError } from "./error.js";

describe("VibefunError", () => {
    it("should create error with message", () => {
        const error = new VibefunError("Test error");
        expect(error.message).toBe("Test error");
        expect(error.name).toBe("VibefunError");
    });

    it("should include location information", () => {
        const location = {
            file: "test.vf",
            line: 10,
            column: 5,
            offset: 100,
        };
        const error = new VibefunError("Test error", location);
        expect(error.location).toEqual(location);
    });

    it("should include help text", () => {
        const error = new VibefunError("Test error", undefined, "Try this instead");
        expect(error.help).toBe("Try this instead");
    });

    it("should format error message without source", () => {
        const location = {
            file: "test.vf",
            line: 10,
            column: 5,
            offset: 100,
        };
        const error = new VibefunError("Test error", location, "Help text");
        const formatted = error.format();

        expect(formatted).toContain("Error: Test error");
        expect(formatted).toContain("Location: test.vf:10:5");
        expect(formatted).toContain("Help: Help text");
    });

    it("should format error message with source context", () => {
        const source = 'let x = 42\nlet y = "hello"\nlet z = true';
        const location = {
            file: "test.vf",
            line: 2,
            column: 9,
            offset: 19,
        };
        const error = new VibefunError("Test error", location);
        const formatted = error.format(source);

        expect(formatted).toContain('let y = "hello"');
        expect(formatted).toContain("^");
    });

    it("should format error without location", () => {
        const error = new VibefunError("Test error");
        const formatted = error.format();

        expect(formatted).toContain("Error: Test error");
        expect(formatted).not.toContain("Location:");
    });
});

describe("LexerError", () => {
    it("should create lexer error", () => {
        const location = { file: "test.vf", line: 1, column: 1, offset: 0 };
        const error = new LexerError("Invalid token", location);
        expect(error.name).toBe("LexerError");
        expect(error.message).toBe("Invalid token");
    });

    it("should include help text", () => {
        const location = { file: "test.vf", line: 1, column: 1, offset: 0 };
        const error = new LexerError("Invalid token", location, "Check your syntax");
        expect(error.help).toBe("Check your syntax");
    });
});

describe("ParserError", () => {
    it("should create parser error", () => {
        const location = { file: "test.vf", line: 1, column: 1, offset: 0 };
        const error = new ParserError("Unexpected token", location);
        expect(error.name).toBe("ParserError");
        expect(error.message).toBe("Unexpected token");
    });
});

describe("TypeError", () => {
    it("should create type error", () => {
        const location = { file: "test.vf", line: 1, column: 1, offset: 0 };
        const error = new TypeError("Type mismatch", location);
        expect(error.name).toBe("TypeError");
        expect(error.message).toBe("Type mismatch");
    });
});
