/**
 * Direct unit tests for the `lowerLetBinding` helper.
 *
 * The helper is shared by `desugarer.ts:case "Let"` and `desugarBlock.ts`
 * to keep the surface-`Let` lowering identical across both call sites
 * (recursive/non-recursive, mutable, and `loc` propagation). These tests
 * pin the contract directly so any drift is caught here in addition to
 * the matrix in `tests/e2e/let-binding-matrix.test.ts`.
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { lowerLetBinding } from "./lowerLetBinding.js";

const testLoc: Location = { file: "test.vf", line: 1, column: 1, offset: 0 };
const valueLoc: Location = { file: "test.vf", line: 2, column: 5, offset: 12 };
const bodyLoc: Location = { file: "test.vf", line: 3, column: 3, offset: 28 };

const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "IntLit") return { kind: "CoreIntLit", value: expr.value, loc: expr.loc };
    if (expr.kind === "Var") return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    throw new Error(`mockDesugar: unsupported expr.kind ${expr.kind}`);
};

const mockDesugarPattern = (pattern: Pattern, _gen: FreshVarGen): CorePattern => {
    if (pattern.kind === "VarPattern") return { kind: "CoreVarPattern", name: pattern.name, loc: pattern.loc };
    throw new Error(`mockDesugarPattern: unsupported pattern.kind ${pattern.kind}`);
};

const mockGen = { fresh: () => "$tmp0", reset: () => {} } as FreshVarGen;

function makeLet(opts: {
    name: string;
    valueLit: number;
    recursive: boolean;
    mutable: boolean;
    loc?: Location;
}): Extract<Expr, { kind: "Let" }> {
    return {
        kind: "Let",
        pattern: { kind: "VarPattern", name: opts.name, loc: opts.loc ?? testLoc },
        value: { kind: "IntLit", value: opts.valueLit, loc: valueLoc },
        body: { kind: "IntLit", value: 0, loc: bodyLoc }, // unused: caller supplies body
        mutable: opts.mutable,
        recursive: opts.recursive,
        loc: opts.loc ?? testLoc,
    };
}

const externalBody: CoreExpr = { kind: "CoreIntLit", value: 99, loc: bodyLoc };

describe("lowerLetBinding", () => {
    it("lowers a non-recursive Let into CoreLet with the externally-supplied body", () => {
        const expr = makeLet({ name: "x", valueLit: 7, recursive: false, mutable: false });
        const result = lowerLetBinding(expr, externalBody, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLet");
        if (result.kind !== "CoreLet") throw new Error("Expected CoreLet");
        expect(result.pattern).toEqual({ kind: "CoreVarPattern", name: "x", loc: testLoc });
        expect(result.value).toEqual({ kind: "CoreIntLit", value: 7, loc: valueLoc });
        // The body must be the *caller*-supplied CoreExpr, not whatever
        // mockDesugar would have produced from `expr.body`.
        expect(result.body).toBe(externalBody);
        expect(result.mutable).toBe(false);
        expect(result.loc).toBe(testLoc);
    });

    it("preserves the mutable flag on a non-recursive Let", () => {
        const expr = makeLet({ name: "y", valueLit: 1, recursive: false, mutable: true });
        const result = lowerLetBinding(expr, externalBody, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLet");
        if (result.kind !== "CoreLet") throw new Error("Expected CoreLet");
        expect(result.mutable).toBe(true);
    });

    it("lowers a recursive Let into a single-binding CoreLetRecExpr", () => {
        const expr = makeLet({ name: "fact", valueLit: 1, recursive: true, mutable: false });
        const result = lowerLetBinding(expr, externalBody, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLetRecExpr");
        if (result.kind !== "CoreLetRecExpr") throw new Error("Expected CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        const binding = result.bindings[0];
        if (binding === undefined) throw new Error("Expected one binding");
        expect(binding.pattern).toEqual({ kind: "CoreVarPattern", name: "fact", loc: testLoc });
        expect(binding.value).toEqual({ kind: "CoreIntLit", value: 1, loc: valueLoc });
        expect(binding.mutable).toBe(false);
        expect(binding.loc).toBe(testLoc);
        expect(result.body).toBe(externalBody);
        expect(result.loc).toBe(testLoc);
    });

    it("propagates the mutable flag onto the rec-binding when the Let is recursive and mutable", () => {
        // `let rec mut x = …` — only valid when the RHS is `Ref<T>` per
        // VF4018, but the lowering itself still has to thread `mutable`.
        const expr = makeLet({ name: "x", valueLit: 0, recursive: true, mutable: true });
        const result = lowerLetBinding(expr, externalBody, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLetRecExpr");
        if (result.kind !== "CoreLetRecExpr") throw new Error("Expected CoreLetRecExpr");
        const binding = result.bindings[0];
        if (binding === undefined) throw new Error("Expected one binding");
        expect(binding.mutable).toBe(true);
    });

    it("does not call `desugar` on the source expr.body — the caller controls the body slot", () => {
        // The whole point of the helper is that the caller decides the
        // body. If the helper invoked `desugar(expr.body, …)` it would
        // double-build the body when `desugarBlock` already has the
        // running accumulator. Verify by giving a `body` that mockDesugar
        // can't handle: any internal call would throw.
        const expr: Extract<Expr, { kind: "Let" }> = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "z", loc: testLoc },
            value: { kind: "IntLit", value: 5, loc: valueLoc },
            body: { kind: "BoolLit", value: true, loc: bodyLoc }, // mockDesugar throws on BoolLit
            mutable: false,
            recursive: false,
            loc: testLoc,
        };
        expect(() => lowerLetBinding(expr, externalBody, mockGen, mockDesugar, mockDesugarPattern)).not.toThrow();
    });
});
