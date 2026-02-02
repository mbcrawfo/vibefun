/**
 * Record execution tests for ES2020 code generator
 *
 * Tests structural equality and record operations.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("structural equality - records", () => {
    it("should compare records structurally", () => {
        const result = compileAndGetExport(
            `let a = { x: 1, y: 2 };
            let b = { x: 1, y: 2 };
            let result = a == b;`,
            "result",
        );
        expect(result).toBe(true);
    });

    it("should detect record inequality", () => {
        const result = compileAndGetExport(
            `let a = { x: 1, y: 2 };
            let b = { x: 1, y: 3 };
            let result = a == b;`,
            "result",
        );
        expect(result).toBe(false);
    });

    it("should compare nested records structurally", () => {
        const result = compileAndGetExport(
            `let a = { point: { x: 1, y: 2 }, name: "origin" };
            let b = { point: { x: 1, y: 2 }, name: "origin" };
            let result = a == b;`,
            "result",
        );
        expect(result).toBe(true);
    });
});

describe("record operations", () => {
    it("should access record fields", () => {
        const result = compileAndGetExport(
            `let point = { x: 10, y: 20 };
            let result = point.x + point.y;`,
            "result",
        );
        expect(result).toBe(30);
    });

    it("should update records immutably", () => {
        const result = compileAndGetExport(
            `let point = { x: 10, y: 20 };
            let moved = { ...point, x: 15 };
            let result = moved.x + moved.y;`,
            "result",
        );
        expect(result).toBe(35);
    });
});
