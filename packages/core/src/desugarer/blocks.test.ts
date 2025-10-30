/**
 * Tests for block expression desugaring
 *
 * Blocks are desugared into nested let bindings:
 * { let x = 1; let y = 2; x + y } => let x = 1 in (let y = 2 in (x + y))
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreBinOp,
    CoreIntLit,
    CoreLet,
    CoreRecordPattern,
    CoreStringLit,
    CoreVar,
    CoreVariantPattern,
    CoreVarPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";
import { DesugarError } from "./DesugarError.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Block Desugaring - Basic Cases", () => {
    it("should desugar single-expression block", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [{ kind: "IntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const result = desugar(block);

        // Single expression - no let wrapping needed
        expect(result.kind).toBe("CoreIntLit");
        expect((result as CoreIntLit).value).toBe(42);
    });

    it("should desugar two-expression block (one let + final expr)", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc }, // Dummy body
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        const letResult = result as CoreLet;
        expect(letResult.kind).toBe("CoreLet");
        expect(letResult.pattern.kind).toBe("CoreVarPattern");
        expect((letResult.pattern as CoreVarPattern).name).toBe("x");
        expect(letResult.value.kind).toBe("CoreIntLit");
        expect((letResult.value as CoreIntLit).value).toBe(10);
        expect(letResult.body.kind).toBe("CoreVar");
        expect((letResult.body as CoreVar).name).toBe("x");
    });

    it("should desugar three-expression block (two lets + final expr)", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                    value: { kind: "IntLit", value: 20, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "Var", name: "y", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        // Outer let: x = 10
        const outerLet = result as CoreLet;
        expect(outerLet.kind).toBe("CoreLet");
        expect((outerLet.pattern as CoreVarPattern).name).toBe("x");
        expect((outerLet.value as CoreIntLit).value).toBe(10);

        // Inner let: y = 20
        const innerLet = outerLet.body as CoreLet;
        expect(innerLet.kind).toBe("CoreLet");
        expect((innerLet.pattern as CoreVarPattern).name).toBe("y");
        expect((innerLet.value as CoreIntLit).value).toBe(20);

        // Innermost body: x + y
        const body = innerLet.body as CoreBinOp;
        expect(body.kind).toBe("CoreBinOp");
        expect(body.op).toBe("Add");
    });

    it("should desugar four-expression block (three lets + final expr)", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "a", loc: testLoc },
                    value: { kind: "IntLit", value: 1, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "b", loc: testLoc },
                    value: { kind: "IntLit", value: 2, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "c", loc: testLoc },
                    value: { kind: "IntLit", value: 3, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "StringLit", value: "done", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        // Verify nested structure: let a = 1 in (let b = 2 in (let c = 3 in "done"))
        const level1 = result as CoreLet;
        expect(level1.kind).toBe("CoreLet");
        expect((level1.pattern as CoreVarPattern).name).toBe("a");

        const level2 = level1.body as CoreLet;
        expect(level2.kind).toBe("CoreLet");
        expect((level2.pattern as CoreVarPattern).name).toBe("b");

        const level3 = level2.body as CoreLet;
        expect(level3.kind).toBe("CoreLet");
        expect((level3.pattern as CoreVarPattern).name).toBe("c");

        const finalExpr = level3.body as CoreStringLit;
        expect(finalExpr.kind).toBe("CoreStringLit");
        expect(finalExpr.value).toBe("done");
    });
});

describe("Block Desugaring - Mutable and Recursive Let", () => {
    it("should preserve mutable flag in block lets", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: true,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        expect(result.kind).toBe("CoreLet");
        expect((result as CoreLet).mutable).toBe(true);
    });

    it("should preserve recursive flag in block lets", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "factorial", loc: testLoc },
                    value: { kind: "IntLit", value: 0, loc: testLoc }, // Dummy lambda
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: true,
                    loc: testLoc,
                },
                { kind: "Var", name: "factorial", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        expect(result.kind).toBe("CoreLet");
        expect((result as CoreLet).recursive).toBe(true);
    });
});

describe("Block Desugaring - Nested Blocks", () => {
    it("should desugar nested blocks", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: {
                        // Inner block
                        kind: "Block",
                        exprs: [
                            {
                                kind: "Let",
                                pattern: { kind: "VarPattern", name: "a", loc: testLoc },
                                value: { kind: "IntLit", value: 5, loc: testLoc },
                                body: { kind: "UnitLit", loc: testLoc },
                                mutable: false,
                                recursive: false,
                                loc: testLoc,
                            },
                            { kind: "Var", name: "a", loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        // Outer structure
        const outerLet = result as CoreLet;
        expect(outerLet.kind).toBe("CoreLet");
        expect((outerLet.pattern as CoreVarPattern).name).toBe("x");

        // Value should be a desugared inner block (let a = 5 in a)
        const value = outerLet.value as CoreLet;
        expect(value.kind).toBe("CoreLet");
        expect((value.pattern as CoreVarPattern).name).toBe("a");
        expect((value.value as CoreIntLit).value).toBe(5);
        expect(value.body.kind).toBe("CoreVar");
        expect((value.body as CoreVar).name).toBe("a");
    });
});

describe("Block Desugaring - Complex Expressions", () => {
    it("should desugar blocks with complex final expression", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    // Complex final expression
                    kind: "BinOp",
                    op: "Multiply",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "IntLit", value: 2, loc: testLoc },
                        right: { kind: "IntLit", value: 3, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        const letResult = result as CoreLet;
        expect(letResult.kind).toBe("CoreLet");
        const body = letResult.body as CoreBinOp;
        expect(body.kind).toBe("CoreBinOp");
        expect(body.op).toBe("Multiply");
        const rightOp = body.right as CoreBinOp;
        expect(rightOp.kind).toBe("CoreBinOp");
        expect(rightOp.op).toBe("Add");
    });

    it("should desugar blocks with complex let values", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "sum", loc: testLoc },
                    value: {
                        // Complex value
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "IntLit", value: 1, loc: testLoc },
                        right: { kind: "IntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "Var", name: "sum", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        const letResult = result as CoreLet;
        expect(letResult.kind).toBe("CoreLet");
        const value = letResult.value as CoreBinOp;
        expect(value.kind).toBe("CoreBinOp");
        expect(value.op).toBe("Add");
    });
});

describe("Block Desugaring - Source Locations", () => {
    it("should preserve source locations from let expressions", () => {
        const letLoc: Location = {
            file: "test.vf",
            line: 10,
            column: 5,
            offset: 100,
        };

        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: letLoc,
                },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        expect(result.loc).toBe(letLoc);
    });
});

describe("Block Desugaring - Error Cases", () => {
    it("should throw error for empty block", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [],
            loc: testLoc,
        };

        expect(() => desugar(block)).toThrow(DesugarError);
        expect(() => desugar(block)).toThrow("Empty block expression");
    });

    it("should throw error for non-let expression in middle of block", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                // First expr should be Let, but it's not
                { kind: "IntLit", value: 42, loc: testLoc },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        expect(() => desugar(block)).toThrow(DesugarError);
        expect(() => desugar(block)).toThrow("Non-let expression in block (except final expression)");
    });

    it("should throw error for non-let in middle of three-expr block", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 10, loc: testLoc },
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                // This should be Let, but it's not
                { kind: "IntLit", value: 20, loc: testLoc },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        expect(() => desugar(block)).toThrow(DesugarError);
    });
});

describe("Block Desugaring - Pattern Matching", () => {
    it("should desugar blocks with destructuring patterns", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: {
                        kind: "ConstructorPattern",
                        constructor: "Some",
                        args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                        loc: testLoc,
                    },
                    value: { kind: "IntLit", value: 42, loc: testLoc }, // Dummy value
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                { kind: "Var", name: "x", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        const letResult = result as CoreLet;
        expect(letResult.kind).toBe("CoreLet");
        expect(letResult.pattern.kind).toBe("CoreVariantPattern");
        expect((letResult.pattern as CoreVariantPattern).constructor).toBe("Some");
    });

    it("should desugar blocks with record patterns", () => {
        const block: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: {
                        kind: "RecordPattern",
                        fields: [
                            {
                                name: "x",
                                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                                loc: testLoc,
                            },
                            {
                                name: "y",
                                pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    value: { kind: "IntLit", value: 0, loc: testLoc }, // Dummy value
                    body: { kind: "UnitLit", loc: testLoc },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
                {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "Var", name: "y", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(block);

        const letResult = result as CoreLet;
        expect(letResult.kind).toBe("CoreLet");
        expect(letResult.pattern.kind).toBe("CoreRecordPattern");
        expect((letResult.pattern as CoreRecordPattern).fields).toHaveLength(2);
    });
});
