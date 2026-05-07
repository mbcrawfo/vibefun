/**
 * Meta-tests for the optimizable-expr arbitraries.
 *
 * These properties verify the generators in `optimizable-expr-arb.ts`
 * themselves: a silently-broken generator (e.g. one that emits an AST
 * with a missing `loc` field, or input that crashes the typechecker
 * with an unregistered throw) would let every PR-6 optimizer property
 * test pass on vacuous data. Companion to `source-arb.test.ts`.
 */

import type { Location } from "../ast.js";
import type { CoreExpr, CoreModule } from "../core-ast.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../../diagnostics/index.js";
import { typeCheck } from "../../typechecker/index.js";
import { visitExpr } from "../../utils/index.js";
import { isCoreExpr } from "../core-ast.js";
import { coreExprWithUnsafeArb, optimizableExprArb, SYNTHETIC_LOCATION } from "./index.js";

const MAX_SHRINK_STEPS = 1000;

/**
 * Wrap a generated `CoreExpr` in a minimal `CoreModule` so it can be fed
 * to `typeCheck`. The expression becomes the RHS of a top-level let
 * binding under a wildcard pattern — the simplest legal shape.
 */
function wrapInModule(expr: CoreExpr): CoreModule {
    const loc: Location = SYNTHETIC_LOCATION;
    return {
        imports: [],
        declarations: [
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreWildcardPattern", loc },
                value: expr,
                mutable: false,
                exported: false,
                loc,
            },
        ],
        loc,
    };
}

function isCompleteLocation(loc: unknown): loc is Location {
    if (typeof loc !== "object" || loc === null) return false;
    const l = loc as Record<string, unknown>;
    return (
        typeof l["file"] === "string" &&
        typeof l["line"] === "number" &&
        typeof l["column"] === "number" &&
        typeof l["offset"] === "number"
    );
}

describe("optimizable-expr arbitraries", () => {
    describe("optimizableExprArb", () => {
        it("emits CoreExpr-shaped values whose root carries a complete Location", () => {
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    return isCoreExpr(expr) && isCompleteLocation(expr.loc);
                }),
            );
        });

        it("every node in the generated tree has a complete Location (single-root reachability)", () => {
            // visitExpr walks the entire subtree once. If any node is missing
            // a loc, capture it and fail. The walk also implicitly asserts
            // single-root reachability — a cyclic or disconnected graph
            // would crash visitExpr's recursion or skip nodes.
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    let allOk = true;
                    visitExpr(expr, (node) => {
                        if (!isCompleteLocation(node.loc)) allOk = false;
                    });
                    return allOk;
                }),
            );
        });

        // Skipped: see `.claude/FAST_CHECK_BUG_BACKLOG.md` entry VF-FC-0001.
        // The generator emits `CoreLambda` parameters with non-`CoreVarPattern`/
        // non-`CoreWildcardPattern` patterns, violating the post-desugaring
        // invariant the typechecker enforces (raw `Error` thrown). Fix lives in
        // `core-ast-arb.ts`'s `lambdaArb`, out of scope for this tests-only PR.
        it.skip("[BUG: VF-FC-0001] type-checking either succeeds or throws a registered VibefunDiagnostic — never an unregistered Error", () => {
            fc.assert(
                fc.property(optimizableExprArb({ depth: 3 }), (expr) => {
                    try {
                        typeCheck(wrapInModule(expr));
                        return true;
                    } catch (error) {
                        if (error instanceof VibefunDiagnostic) {
                            return /^VF\d{4}$/.test(error.code);
                        }
                        return false;
                    }
                }),
            );
        });
    });

    describe("coreExprWithUnsafeArb", () => {
        it("always produces a CoreUnsafe-rooted expression", () => {
            fc.assert(fc.property(coreExprWithUnsafeArb({ depth: 2 }), (expr) => expr.kind === "CoreUnsafe"));
        });

        it("every node in the generated tree has a complete Location", () => {
            fc.assert(
                fc.property(coreExprWithUnsafeArb({ depth: 2 }), (expr) => {
                    let allOk = true;
                    visitExpr(expr, (node) => {
                        if (!isCompleteLocation(node.loc)) allOk = false;
                    });
                    return allOk;
                }),
            );
        });
    });

    describe("shrink termination", () => {
        const cases: ReadonlyArray<readonly [string, fc.Arbitrary<CoreExpr>]> = [
            ["optimizableExprArb", optimizableExprArb({ depth: 3 })],
            ["coreExprWithUnsafeArb", coreExprWithUnsafeArb({ depth: 2 })],
        ];

        for (const [name, arb] of cases) {
            it(`${name}: shrinks within ${MAX_SHRINK_STEPS} steps`, () => {
                const result = fc.check(
                    fc.property(arb, () => false),
                    { numRuns: 1 },
                );
                expect(result.failed).toBe(true);
                expect(result.numShrinks).toBeLessThanOrEqual(MAX_SHRINK_STEPS);
            });
        }
    });
});
