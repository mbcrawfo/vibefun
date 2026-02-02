import { describe, expect, it } from "vitest";

import { emitMatchPattern, emitPattern, extractPatternNames, setEmitExpr } from "./emit-patterns.js";
import { createTestContext, literalPat, recordPat, tuplePat, variantPat, varPat, wildcardPat } from "./test-helpers.js";

// Set up expression emission for testing (not used in pattern emission directly)
setEmitExpr(() => "expr");

describe("Pattern Emission", () => {
    describe("emitPattern (destructuring contexts)", () => {
        describe("Wildcard patterns", () => {
            it("should emit unique identifiers for wildcards", () => {
                const ctx = createTestContext();
                // Each wildcard gets a unique identifier to avoid JS duplicate binding errors
                expect(emitPattern(wildcardPat(), ctx)).toBe("_unused0");
            });

            it("should generate unique identifiers for multiple wildcards", () => {
                const ctx = createTestContext();
                // Multiple wildcards in same context get different names
                expect(emitPattern(wildcardPat(), ctx)).toBe("_unused0");
                expect(emitPattern(wildcardPat(), ctx)).toBe("_unused1");
                expect(emitPattern(wildcardPat(), ctx)).toBe("_unused2");
            });
        });

        describe("Variable patterns", () => {
            it("should emit variable name", () => {
                const ctx = createTestContext();
                expect(emitPattern(varPat("x"), ctx)).toBe("x");
                expect(emitPattern(varPat("myVar"), ctx)).toBe("myVar");
            });

            it("should escape reserved words", () => {
                const ctx = createTestContext();
                expect(emitPattern(varPat("class"), ctx)).toBe("class$");
                expect(emitPattern(varPat("function"), ctx)).toBe("function$");
            });
        });

        describe("Tuple patterns", () => {
            it("should emit array destructuring", () => {
                const ctx = createTestContext();
                const pattern = tuplePat([varPat("a"), varPat("b")]);
                expect(emitPattern(pattern, ctx)).toBe("[a, b]");
            });

            it("should handle nested tuple patterns", () => {
                const ctx = createTestContext();
                const pattern = tuplePat([varPat("a"), tuplePat([varPat("b"), varPat("c")])]);
                expect(emitPattern(pattern, ctx)).toBe("[a, [b, c]]");
            });

            it("should handle wildcards in tuples", () => {
                const ctx = createTestContext();
                const pattern = tuplePat([varPat("a"), wildcardPat(), varPat("c")]);
                // Wildcards get unique identifiers to avoid duplicate binding
                expect(emitPattern(pattern, ctx)).toBe("[a, _unused0, c]");
            });
        });

        describe("Record patterns", () => {
            it("should emit object destructuring with shorthand", () => {
                const ctx = createTestContext();
                const pattern = recordPat([
                    { name: "x", pattern: varPat("x") },
                    { name: "y", pattern: varPat("y") },
                ]);
                expect(emitPattern(pattern, ctx)).toBe("{ x, y }");
            });

            it("should emit full destructuring when names differ", () => {
                const ctx = createTestContext();
                const pattern = recordPat([
                    { name: "x", pattern: varPat("a") },
                    { name: "y", pattern: varPat("b") },
                ]);
                expect(emitPattern(pattern, ctx)).toBe("{ x: a, y: b }");
            });

            it("should handle mixed shorthand and full destructuring", () => {
                const ctx = createTestContext();
                const pattern = recordPat([
                    { name: "x", pattern: varPat("x") },
                    { name: "y", pattern: varPat("other") },
                ]);
                expect(emitPattern(pattern, ctx)).toBe("{ x, y: other }");
            });

            it("should handle nested patterns", () => {
                const ctx = createTestContext();
                const pattern = recordPat([{ name: "point", pattern: tuplePat([varPat("x"), varPat("y")]) }]);
                expect(emitPattern(pattern, ctx)).toBe("{ point: [x, y] }");
            });
        });

        describe("Error cases", () => {
            it("should throw on literal patterns in destructuring", () => {
                const ctx = createTestContext();
                expect(() => emitPattern(literalPat(42), ctx)).toThrow(
                    "Literal patterns cannot be used in destructuring",
                );
            });

            it("should throw on variant patterns in destructuring", () => {
                const ctx = createTestContext();
                expect(() => emitPattern(variantPat("Some", [varPat("x")]), ctx)).toThrow(
                    "Variant patterns cannot be used in simple destructuring",
                );
            });
        });
    });

    describe("emitMatchPattern (match case contexts)", () => {
        describe("Wildcard patterns", () => {
            it("should return no condition for wildcard", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(wildcardPat(), "$match", ctx);
                expect(result.condition).toBe(null);
                expect(result.bindings).toEqual([]);
            });
        });

        describe("Variable patterns", () => {
            it("should bind the scrutinee", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(varPat("x"), "$match", ctx);
                expect(result.condition).toBe(null);
                expect(result.bindings).toEqual(["const x = $match;"]);
            });

            it("should escape reserved words", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(varPat("class"), "$match", ctx);
                expect(result.bindings).toEqual(["const class$ = $match;"]);
            });
        });

        describe("Literal patterns", () => {
            it("should check integer equality", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat(42), "$match", ctx);
                expect(result.condition).toBe("$match === 42");
                expect(result.bindings).toEqual([]);
            });

            it("should handle negative integers", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat(-5), "$match", ctx);
                expect(result.condition).toBe("$match === (-5)");
            });

            it("should check float equality", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat(3.14), "$match", ctx);
                expect(result.condition).toBe("$match === 3.14");
            });

            it("should check string equality", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat("hello"), "$match", ctx);
                expect(result.condition).toBe('$match === "hello"');
            });

            it("should escape strings properly", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat('say "hi"'), "$match", ctx);
                expect(result.condition).toBe('$match === "say \\"hi\\""');
            });

            it("should check boolean equality", () => {
                const ctx = createTestContext();
                expect(emitMatchPattern(literalPat(true), "$match", ctx).condition).toBe("$match === true");
                expect(emitMatchPattern(literalPat(false), "$match", ctx).condition).toBe("$match === false");
            });

            it("should check null (unit) as undefined", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat(null), "$match", ctx);
                expect(result.condition).toBe("$match === undefined");
            });

            it("should handle NaN with Number.isNaN", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(literalPat(NaN), "$match", ctx);
                expect(result.condition).toBe("Number.isNaN($match)");
            });

            it("should handle Infinity", () => {
                const ctx = createTestContext();
                expect(emitMatchPattern(literalPat(Infinity), "$match", ctx).condition).toBe("$match === Infinity");
                expect(emitMatchPattern(literalPat(-Infinity), "$match", ctx).condition).toBe("$match === -Infinity");
            });
        });

        describe("Tuple patterns", () => {
            it("should check array and length", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(tuplePat([varPat("a"), varPat("b")]), "$match", ctx);
                expect(result.condition).toContain("Array.isArray($match)");
                expect(result.condition).toContain("$match.length === 2");
            });

            it("should bind elements", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(tuplePat([varPat("a"), varPat("b")]), "$match", ctx);
                expect(result.bindings).toContain("const a = $match[0];");
                expect(result.bindings).toContain("const b = $match[1];");
            });

            it("should handle nested literal patterns", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(tuplePat([literalPat(1), varPat("b")]), "$match", ctx);
                expect(result.condition).toContain("$match[0] === 1");
                expect(result.bindings).toContain("const b = $match[1];");
            });

            it("should handle deeply nested patterns", () => {
                const ctx = createTestContext();
                const pattern = tuplePat([tuplePat([varPat("a"), varPat("b")]), varPat("c")]);
                const result = emitMatchPattern(pattern, "$match", ctx);
                expect(result.condition).toContain("Array.isArray($match[0])");
                expect(result.bindings).toContain("const a = $match[0][0];");
                expect(result.bindings).toContain("const b = $match[0][1];");
                expect(result.bindings).toContain("const c = $match[1];");
            });
        });

        describe("Record patterns", () => {
            it("should check object type", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(recordPat([{ name: "x", pattern: varPat("x") }]), "$match", ctx);
                expect(result.condition).toContain('typeof $match === "object"');
                expect(result.condition).toContain("$match !== null");
            });

            it("should bind fields", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(
                    recordPat([
                        { name: "x", pattern: varPat("a") },
                        { name: "y", pattern: varPat("b") },
                    ]),
                    "$match",
                    ctx,
                );
                expect(result.bindings).toContain("const a = $match.x;");
                expect(result.bindings).toContain("const b = $match.y;");
            });

            it("should handle nested literal patterns", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(
                    recordPat([
                        { name: "x", pattern: literalPat(0) },
                        { name: "y", pattern: varPat("y") },
                    ]),
                    "$match",
                    ctx,
                );
                expect(result.condition).toContain("$match.x === 0");
                expect(result.bindings).toContain("const y = $match.y;");
            });
        });

        describe("Variant patterns", () => {
            it("should check tag", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(variantPat("Some", [varPat("x")]), "$match", ctx);
                expect(result.condition).toContain('$match.$tag === "Some"');
            });

            it("should bind arguments", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(variantPat("Some", [varPat("x")]), "$match", ctx);
                expect(result.bindings).toContain("const x = $match.$0;");
            });

            it("should handle zero-arg constructors", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(variantPat("None", []), "$match", ctx);
                // Includes null/object checks before tag access for safety
                expect(result.condition).toBe(
                    'typeof $match === "object" && $match !== null && $match.$tag === "None"',
                );
                expect(result.bindings).toEqual([]);
            });

            it("should handle multiple arguments", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(
                    variantPat("Node", [varPat("left"), varPat("value"), varPat("right")]),
                    "$match",
                    ctx,
                );
                expect(result.condition).toContain('$match.$tag === "Node"');
                expect(result.bindings).toContain("const left = $match.$0;");
                expect(result.bindings).toContain("const value = $match.$1;");
                expect(result.bindings).toContain("const right = $match.$2;");
            });

            it("should handle nested patterns in arguments", () => {
                const ctx = createTestContext();
                const result = emitMatchPattern(
                    variantPat("Pair", [tuplePat([varPat("a"), varPat("b")])]),
                    "$match",
                    ctx,
                );
                expect(result.condition).toContain('$match.$tag === "Pair"');
                expect(result.condition).toContain("Array.isArray($match.$0)");
                expect(result.bindings).toContain("const a = $match.$0[0];");
                expect(result.bindings).toContain("const b = $match.$0[1];");
            });
        });
    });

    describe("extractPatternNames", () => {
        it("should return empty for wildcard", () => {
            expect(extractPatternNames(wildcardPat())).toEqual([]);
        });

        it("should return name for variable pattern", () => {
            expect(extractPatternNames(varPat("x"))).toEqual(["x"]);
        });

        it("should return empty for literal pattern", () => {
            expect(extractPatternNames(literalPat(42))).toEqual([]);
        });

        it("should extract names from tuple pattern", () => {
            const pattern = tuplePat([varPat("a"), varPat("b"), varPat("c")]);
            expect(extractPatternNames(pattern)).toEqual(["a", "b", "c"]);
        });

        it("should extract names from record pattern", () => {
            const pattern = recordPat([
                { name: "x", pattern: varPat("a") },
                { name: "y", pattern: varPat("b") },
            ]);
            expect(extractPatternNames(pattern)).toEqual(["a", "b"]);
        });

        it("should extract names from variant pattern", () => {
            const pattern = variantPat("Some", [varPat("x")]);
            expect(extractPatternNames(pattern)).toEqual(["x"]);
        });

        it("should handle nested patterns", () => {
            const pattern = tuplePat([
                varPat("a"),
                tuplePat([varPat("b"), varPat("c")]),
                recordPat([{ name: "x", pattern: varPat("d") }]),
            ]);
            expect(extractPatternNames(pattern)).toEqual(["a", "b", "c", "d"]);
        });

        it("should skip wildcards in nested patterns", () => {
            const pattern = tuplePat([varPat("a"), wildcardPat(), varPat("c")]);
            expect(extractPatternNames(pattern)).toEqual(["a", "c"]);
        });
    });
});
