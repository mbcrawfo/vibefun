/**
 * Tests for DesugarError class
 */

import type { Location } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { DesugarError } from "./DesugarError.js";

// Helper to create test location
const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("DesugarError", () => {
    it("should create error with location", () => {
        const error = new DesugarError("Test error", testLoc);

        expect(error.message).toBe("Test error");
        expect(error.loc).toBe(testLoc);
        expect(error.name).toBe("DesugarError");
    });

    it("should format error with location", () => {
        const error = new DesugarError("Test error", testLoc);
        const formatted = error.format();

        expect(formatted).toContain("Error: Test error");
        expect(formatted).toContain("test.vf:1:1");
    });

    it("should include hint in formatted output", () => {
        const error = new DesugarError("Test error", testLoc, "Try this instead");
        const formatted = error.format();

        expect(formatted).toContain("Hint: Try this instead");
    });
});
