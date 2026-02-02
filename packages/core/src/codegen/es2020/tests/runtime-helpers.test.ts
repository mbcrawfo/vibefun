import { describe, expect, it } from "vitest";

import { generateEqHelper, generateRefHelper, generateRuntimeHelpers } from "../runtime-helpers.js";

describe("Runtime Helpers", () => {
    describe("generateRefHelper", () => {
        it("should generate ref helper function", () => {
            const result = generateRefHelper();
            expect(result).toBe("const ref = ($value) => ({ $value });");
        });

        it("should generate valid JavaScript", () => {
            const result = generateRefHelper();
            // Should be valid JS that can be evaluated
            expect(() => new Function(result)).not.toThrow();
        });
    });

    describe("generateEqHelper", () => {
        it("should generate $eq helper function", () => {
            const result = generateEqHelper();
            expect(result).toContain("const $eq = (a, b) => {");
            expect(result).toContain("if (a === b) return true;");
        });

        it("should handle identity check first", () => {
            const result = generateEqHelper();
            expect(result).toContain("if (a === b) return true;");
        });

        it("should handle null/undefined", () => {
            const result = generateEqHelper();
            expect(result).toContain("if (a == null || b == null) return false;");
        });

        it("should handle refs with identity only", () => {
            const result = generateEqHelper();
            expect(result).toContain('"$value" in a && "$value" in b');
            expect(result).toContain("return a === b");
        });

        it("should handle variants with $tag comparison", () => {
            const result = generateEqHelper();
            expect(result).toContain('"$tag" in a');
            expect(result).toContain("a.$tag !== b.$tag");
        });

        it("should handle arrays (tuples)", () => {
            const result = generateEqHelper();
            expect(result).toContain("Array.isArray(a)");
            expect(result).toContain("a.length !== b.length");
            expect(result).toContain("a.every");
        });

        it("should handle records with key comparison", () => {
            const result = generateEqHelper();
            expect(result).toContain("Object.keys(a)");
            expect(result).toContain("keysA.length !== keysB.length");
        });

        it("should generate valid JavaScript", () => {
            const result = generateEqHelper();
            // Should be valid JS that can be evaluated
            expect(() => new Function(result)).not.toThrow();
        });
    });

    describe("generateRuntimeHelpers", () => {
        it("should return empty string when no helpers needed", () => {
            const result = generateRuntimeHelpers(false, false);
            expect(result).toBe("");
        });

        it("should generate only ref when needed", () => {
            const result = generateRuntimeHelpers(true, false);
            expect(result).toContain("const ref");
            expect(result).not.toContain("const $eq");
        });

        it("should generate only $eq when needed", () => {
            const result = generateRuntimeHelpers(false, true);
            expect(result).not.toContain("const ref");
            expect(result).toContain("const $eq");
        });

        it("should generate both helpers when both needed", () => {
            const result = generateRuntimeHelpers(true, true);
            expect(result).toContain("const ref");
            expect(result).toContain("const $eq");
        });

        it("should separate helpers with newline", () => {
            const result = generateRuntimeHelpers(true, true);
            const lines = result.split("\n");
            // ref helper is single line, $eq is multi-line
            expect(lines[0]).toContain("const ref");
            expect(lines[1]).toContain("const $eq");
        });
    });

    describe("$eq runtime behavior", () => {
        // Execute the generated helper and test its behavior
        function getEqFunction(): (a: unknown, b: unknown) => boolean {
            const code = generateEqHelper();
            // Execute the code and return the $eq function
            const fn = new Function(`${code}; return $eq;`);
            return fn() as (a: unknown, b: unknown) => boolean;
        }

        it("should return true for identical primitives", () => {
            const $eq = getEqFunction();
            expect($eq(1, 1)).toBe(true);
            expect($eq("hello", "hello")).toBe(true);
            expect($eq(true, true)).toBe(true);
        });

        it("should return false for different primitives", () => {
            const $eq = getEqFunction();
            expect($eq(1, 2)).toBe(false);
            expect($eq("a", "b")).toBe(false);
        });

        it("should handle null and undefined", () => {
            const $eq = getEqFunction();
            expect($eq(null, null)).toBe(true); // a === b
            expect($eq(undefined, undefined)).toBe(true); // a === b
            expect($eq(null, 1)).toBe(false);
            expect($eq(1, null)).toBe(false);
        });

        it("should compare arrays structurally", () => {
            const $eq = getEqFunction();
            expect($eq([1, 2, 3], [1, 2, 3])).toBe(true);
            expect($eq([1, 2], [1, 2, 3])).toBe(false);
            expect($eq([1, 2, 3], [1, 2, 4])).toBe(false);
        });

        it("should compare nested arrays", () => {
            const $eq = getEqFunction();
            expect(
                $eq(
                    [
                        [1, 2],
                        [3, 4],
                    ],
                    [
                        [1, 2],
                        [3, 4],
                    ],
                ),
            ).toBe(true);
            expect(
                $eq(
                    [
                        [1, 2],
                        [3, 4],
                    ],
                    [
                        [1, 2],
                        [3, 5],
                    ],
                ),
            ).toBe(false);
        });

        it("should compare records structurally", () => {
            const $eq = getEqFunction();
            expect($eq({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
            expect($eq({ x: 1 }, { x: 1, y: 2 })).toBe(false);
            expect($eq({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
        });

        it("should compare variants by $tag and fields", () => {
            const $eq = getEqFunction();
            expect($eq({ $tag: "Some", $0: 42 }, { $tag: "Some", $0: 42 })).toBe(true);
            expect($eq({ $tag: "Some", $0: 42 }, { $tag: "None" })).toBe(false);
            expect($eq({ $tag: "Some", $0: 42 }, { $tag: "Some", $0: 43 })).toBe(false);
        });

        it("should compare refs by identity only", () => {
            const $eq = getEqFunction();
            const ref1 = { $value: 42 };
            const ref2 = { $value: 42 };
            expect($eq(ref1, ref1)).toBe(true); // Same reference
            expect($eq(ref1, ref2)).toBe(false); // Different references, same value
        });

        it("should handle NaN correctly (IEEE 754 semantics)", () => {
            const $eq = getEqFunction();
            // NaN === NaN is false in JavaScript
            expect($eq(NaN, NaN)).toBe(false);
        });
    });
});
