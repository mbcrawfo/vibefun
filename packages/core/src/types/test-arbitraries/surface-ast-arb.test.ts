/**
 * Smoke tests for the surface AST arbitrary.
 */

import * as fc from "fast-check";
import { describe, it } from "vitest";

import { surfaceExprArb, surfacePatternArb } from "./index.js";

describe("surface-ast-arb", () => {
    it("surfaceExprArb only emits values with a known kind", () => {
        const knownKinds = new Set([
            "IntLit",
            "FloatLit",
            "StringLit",
            "BoolLit",
            "UnitLit",
            "Var",
            "Let",
            "Lambda",
            "App",
            "If",
            "Match",
            "Block",
            "List",
            "Record",
            "BinOp",
            "UnaryOp",
            "Pipe",
            "Tuple",
        ]);
        fc.assert(
            fc.property(surfaceExprArb({ depth: 3 }), (e) => {
                return knownKinds.has(e.kind);
            }),
        );
    });

    it("surfaceExprArb at depth 0 only emits leaves", () => {
        const leafKinds = new Set(["IntLit", "FloatLit", "StringLit", "BoolLit", "UnitLit", "Var"]);
        fc.assert(
            fc.property(surfaceExprArb({ depth: 0 }), (e) => {
                return leafKinds.has(e.kind);
            }),
        );
    });

    it("surfacePatternArb emits well-formed patterns", () => {
        fc.assert(
            fc.property(surfacePatternArb({ depth: 1 }), (p) => {
                return ["VarPattern", "WildcardPattern", "LiteralPattern"].includes(p.kind);
            }),
        );
    });
});
