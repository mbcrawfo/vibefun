/**
 * Tests for substitution utilities - core functions
 * (substitute, substituteMultiple, freshen)
 */

import type { CoreExpr } from "../types/core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { coreExprArb, identifierArb, substitutionArb } from "../types/test-arbitraries/index.js";
import { freeVars } from "./ast-analysis.js";
import { exprEquals } from "./expr-equality.js";
import { freshen, substitute, substituteMultiple } from "./substitution.js";

const testLoc = { file: "test", line: 1, column: 1, offset: 0 };

describe("Substitution Utilities", () => {
    describe("substitute", () => {
        it("should substitute variable with literal", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            const result = substitute(expr, "x", replacement);

            expect(result).toEqual(replacement);
        });

        it("should not substitute different variable", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "y", loc: testLoc };
            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };

            const result = substitute(expr, "x", replacement);

            expect(result).toEqual(expr);
        });

        it("should substitute in binary operations", () => {
            // x + x
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 5, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual(replacement);
                expect(result.right).toEqual(replacement);
            }
        });

        it("should not substitute bound variables in let", () => {
            // let x = 1 in x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 99, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (it's bound by pattern)
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should substitute in let value but not bound variable in body", () => {
            // let y = x in y
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "y", loc: testLoc },
                value: { kind: "CoreVar", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                expect(result.value).toEqual(replacement); // x replaced in value
                expect(result.body).toEqual({ kind: "CoreVar", name: "y", loc: testLoc }); // y unchanged
            }
        });

        it("should handle capture avoidance in let", () => {
            // let x = 1 in y
            // Substitute y with x
            const expr: CoreExpr = {
                kind: "CoreLet",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: { kind: "CoreIntLit", value: 1, loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                mutable: false,
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = substitute(expr, "y", replacement);

            // Should rename bound x to avoid capture
            expect(result.kind).toBe("CoreLet");
            if (result.kind === "CoreLet") {
                // Pattern should be renamed (x -> x_1 or similar)
                const pattern = result.pattern;
                expect(pattern.kind).toBe("CoreVarPattern");
                if (pattern && pattern.kind === "CoreVarPattern") {
                    expect(pattern.name).not.toBe("x");
                    expect(pattern.name).toContain("x");
                }
            }
        });

        it("should not substitute bound lambda parameter", () => {
            // (x) => x
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "x", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (bound by param)
            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                expect(result.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
            }
        });

        it("should substitute free variables in lambda", () => {
            // (x) => y
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "y", replacement);

            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                expect(result.body).toEqual(replacement);
            }
        });

        it("should handle capture avoidance in lambda", () => {
            // (x) => y
            // Substitute y with x (free variable in replacement)
            const expr: CoreExpr = {
                kind: "CoreLambda",
                param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                body: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const result = substitute(expr, "y", replacement);

            // Should rename bound parameter to avoid capturing free x
            expect(result.kind).toBe("CoreLambda");
            if (result.kind === "CoreLambda") {
                const param = result.param;
                expect(param.kind).toBe("CoreVarPattern");
                if (param && param.kind === "CoreVarPattern") {
                    expect(param.name).not.toBe("x");
                    expect(param.name).toContain("x");
                }
            }
        });

        it("should substitute in match expression", () => {
            // match x { _ => y }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreWildcardPattern", loc: testLoc },
                        body: { kind: "CoreVar", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                expect(result.expr).toEqual(replacement);
            }
        });

        it("should handle pattern bindings in match cases", () => {
            // match val { x => x }
            const expr: CoreExpr = {
                kind: "CoreMatch",
                expr: { kind: "CoreVar", name: "val", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                        body: { kind: "CoreVar", name: "x", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            };

            const replacement: CoreExpr = { kind: "CoreIntLit", value: 42, loc: testLoc };
            const result = substitute(expr, "x", replacement);

            // x in body should NOT be replaced (bound by pattern)
            expect(result.kind).toBe("CoreMatch");
            if (result.kind === "CoreMatch") {
                const case0 = result.cases[0];
                expect(case0).toBeDefined();
                if (case0) {
                    expect(case0.body).toEqual({ kind: "CoreVar", name: "x", loc: testLoc });
                }
            }
        });
    });

    describe("substituteMultiple", () => {
        it("should substitute multiple variables simultaneously", () => {
            // x + y
            const expr: CoreExpr = {
                kind: "CoreBinOp",
                op: "Add",
                left: { kind: "CoreVar", name: "x", loc: testLoc },
                right: { kind: "CoreVar", name: "y", loc: testLoc },
                loc: testLoc,
            };

            const bindings = new Map<string, CoreExpr>([
                ["x", { kind: "CoreIntLit", value: 1, loc: testLoc }],
                ["y", { kind: "CoreIntLit", value: 2, loc: testLoc }],
            ]);

            const result = substituteMultiple(expr, bindings);

            expect(result.kind).toBe("CoreBinOp");
            if (result.kind === "CoreBinOp") {
                expect(result.left).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
                expect(result.right).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
            }
        });

        it("should handle empty bindings", () => {
            const expr: CoreExpr = { kind: "CoreVar", name: "x", loc: testLoc };
            const bindings = new Map<string, CoreExpr>();

            const result = substituteMultiple(expr, bindings);
            expect(result).toEqual(expr);
        });
    });

    describe("freshen", () => {
        it("should return same name if not in avoid set", () => {
            const avoidSet = new Set(["y", "z"]);
            expect(freshen("x", avoidSet)).toBe("x");
        });

        it("should generate fresh name if in avoid set", () => {
            const avoidSet = new Set(["x"]);
            const fresh = freshen("x", avoidSet);

            expect(fresh).not.toBe("x");
            expect(fresh).toContain("x");
        });

        it("should generate unique names for multiple conflicts", () => {
            const avoidSet = new Set(["x", "x_1", "x_2"]);
            const fresh = freshen("x", avoidSet);

            expect(fresh).not.toBe("x");
            expect(fresh).not.toBe("x_1");
            expect(fresh).not.toBe("x_2");
            expect(fresh).toContain("x");
        });
    });

    describe("substitution algebraic properties", () => {
        // The substitution module exposes a small algebra: empty substitution
        // is identity, applying a substitution is deterministic, freshen
        // always picks a name outside the avoid set. We test those three
        // because they're the load-bearing invariants the optimizer relies on.

        it("property: substituteMultiple with empty map is identity", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (e) => {
                    // Use structural equality (exprEquals) rather than referential
                    // equality (===): the contract is "no substitutions changes
                    // the value", not "returns the literal same JS object".
                    const result = substituteMultiple(e, new Map());
                    return exprEquals(e, result);
                }),
            );
        });

        it("property: substituting an unused name leaves the expression structurally equal", () => {
            // Derive the unused name from the expression's own free vars via
            // `freshen`, instead of hard-coding a name like `$unused_var_name`
            // and assuming the identifier generator can never produce it.
            // That decoupling keeps the property correct if the identifier
            // rules ever change.
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), coreExprArb({ depth: 1 }), (e, replacement) => {
                    const unused = freshen("x", freeVars(e));
                    const result = substitute(e, unused, replacement);
                    return exprEquals(e, result);
                }),
            );
        });

        it("property: substitute determinism — same inputs ⇒ same output", () => {
            fc.assert(
                fc.property(
                    coreExprArb({ depth: 3 }),
                    identifierArb,
                    coreExprArb({ depth: 1 }),
                    (e, name, replacement) => {
                        const a = substitute(e, name, replacement);
                        const b = substitute(e, name, replacement);
                        return exprEquals(a, b);
                    },
                ),
            );
        });

        it("property: substituteMultiple determinism over generated substitutions", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), substitutionArb({ maxSize: 3, depth: 1 }), (e, sub) => {
                    const a = substituteMultiple(e, sub);
                    const b = substituteMultiple(e, sub);
                    return exprEquals(a, b);
                }),
            );
        });

        it("property: freshen never returns a name in the avoid set", () => {
            fc.assert(
                fc.property(identifierArb, fc.uniqueArray(identifierArb, { maxLength: 8 }), (base, avoidArray) => {
                    const avoid = new Set(avoidArray);
                    const fresh = freshen(base, avoid);
                    return !avoid.has(fresh);
                }),
            );
        });

        it("property: freshen returns the base name when it's already free", () => {
            fc.assert(
                fc.property(identifierArb, (base) => {
                    return freshen(base, new Set()) === base;
                }),
            );
        });
    });
});
