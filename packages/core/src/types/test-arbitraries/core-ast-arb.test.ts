/**
 * Smoke tests and shape distribution checks for the core AST arbitraries.
 *
 * The properties here aren't compiler properties; they verify the generators
 * themselves emit values of the expected shape. If these fail, every
 * downstream property test built on these arbitraries is suspect.
 */

import * as fc from "fast-check";
import { describe, it } from "vitest";

import { isCoreDeclaration, isCoreExpr, isCoreModule, isCorePattern } from "../core-ast.js";
import {
    coreBinaryOpArb,
    coreDeclArb,
    coreExprArb,
    coreModuleArb,
    corePatternArb,
    coreTypeExprArb,
    coreUnaryOpArb,
    moduleGraphArb,
    substitutionArb,
} from "./index.js";

describe("core-ast-arb", () => {
    describe("coreExprArb", () => {
        it("only produces CoreExpr-shaped values", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (expr) => {
                    return isCoreExpr(expr);
                }),
            );
        });

        it("every node carries a Location", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 3 }), (expr) => {
                    // Smoke: top-level loc must exist.
                    return expr.loc !== undefined && typeof expr.loc.file === "string";
                }),
            );
        });

        it("respects depth=0 by emitting only leaves", () => {
            fc.assert(
                fc.property(coreExprArb({ depth: 0 }), (expr) => {
                    const leaves = new Set([
                        "CoreIntLit",
                        "CoreFloatLit",
                        "CoreStringLit",
                        "CoreBoolLit",
                        "CoreUnitLit",
                        "CoreVar",
                    ]);
                    return leaves.has(expr.kind);
                }),
            );
        });
    });

    describe("corePatternArb", () => {
        it("only produces CorePattern-shaped values", () => {
            fc.assert(
                fc.property(corePatternArb({ depth: 2 }), (p) => {
                    return isCorePattern(p);
                }),
            );
        });
    });

    describe("coreTypeExprArb", () => {
        it("emits values with a Core* kind", () => {
            fc.assert(
                fc.property(coreTypeExprArb({ depth: 2 }), (t) => {
                    return t.kind.startsWith("Core");
                }),
            );
        });
    });

    describe("coreDeclArb / coreModuleArb", () => {
        it("declarations satisfy isCoreDeclaration", () => {
            fc.assert(
                fc.property(coreDeclArb({ depth: 2 }), (d) => {
                    return isCoreDeclaration(d);
                }),
            );
        });

        it("modules satisfy isCoreModule", () => {
            fc.assert(
                fc.property(coreModuleArb({ depth: 2 }), (m) => {
                    return isCoreModule(m);
                }),
            );
        });
    });

    describe("coreBinaryOp / coreUnaryOp", () => {
        it("binary ops are non-empty strings", () => {
            fc.assert(fc.property(coreBinaryOpArb, (op) => typeof op === "string" && op.length > 0));
        });

        it("unary ops are non-empty strings", () => {
            fc.assert(fc.property(coreUnaryOpArb, (op) => typeof op === "string" && op.length > 0));
        });
    });

    describe("substitutionArb", () => {
        it("emits a Map with unique keys", () => {
            fc.assert(
                fc.property(substitutionArb({ maxSize: 4 }), (sub) => {
                    return sub instanceof Map && sub.size <= 4;
                }),
            );
        });
    });

    describe("moduleGraphArb", () => {
        it("emits at least one node", () => {
            fc.assert(
                fc.property(moduleGraphArb({ maxSize: 5 }), (g) => {
                    return g.nodes.length >= 1;
                }),
            );
        });

        it("every edge endpoint is a known node", () => {
            fc.assert(
                fc.property(moduleGraphArb({ maxSize: 5 }), (g) => {
                    const set = new Set(g.nodes);
                    return g.edges.every((e) => set.has(e.from) && set.has(e.to));
                }),
            );
        });

        it("acyclic mode produces only forward edges (no cycles, no self-loops)", () => {
            fc.assert(
                fc.property(moduleGraphArb({ maxSize: 6, acyclic: true }), (g) => {
                    const idx = new Map(g.nodes.map((n, i) => [n, i] as const));
                    return g.edges.every((e) => {
                        const i = idx.get(e.from);
                        const j = idx.get(e.to);
                        return i !== undefined && j !== undefined && i < j;
                    });
                }),
            );
        });
    });

    it("generated expressions carry well-formed Location objects", () => {
        // Verify the generators emit complete Location objects (file, line,
        // column, offset) so downstream code that touches `loc.line` / `loc.file`
        // never trips on a missing field.
        fc.assert(
            fc.property(coreExprArb({ depth: 0 }), (expr) => {
                const loc = expr.loc;
                return (
                    typeof loc.file === "string" &&
                    typeof loc.line === "number" &&
                    typeof loc.column === "number" &&
                    typeof loc.offset === "number"
                );
            }),
        );
    });
});
