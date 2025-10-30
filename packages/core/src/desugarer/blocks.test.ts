/**
 * Tests for block expression desugaring
 *
 * Blocks are desugared into nested let bindings:
 * { let x = 1; let y = 2; x + y } => let x = 1 in (let y = 2 in (x + y))
 */

import type { Expr, Location } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { desugar, DesugarError, FreshVarGen } from "./desugarer.js";

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
        expect((result as any).value).toBe(42);
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

        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.kind).toBe("CoreVarPattern");
        expect((result as any).pattern.name).toBe("x");
        expect((result as any).value.kind).toBe("CoreIntLit");
        expect((result as any).value.value).toBe(10);
        expect((result as any).body.kind).toBe("CoreVar");
        expect((result as any).body.name).toBe("x");
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
        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.name).toBe("x");
        expect((result as any).value.value).toBe(10);

        // Inner let: y = 20
        const innerLet = (result as any).body;
        expect(innerLet.kind).toBe("CoreLet");
        expect(innerLet.pattern.name).toBe("y");
        expect(innerLet.value.value).toBe(20);

        // Innermost body: x + y
        const body = innerLet.body;
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
        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.name).toBe("a");

        const level2 = (result as any).body;
        expect(level2.kind).toBe("CoreLet");
        expect(level2.pattern.name).toBe("b");

        const level3 = level2.body;
        expect(level3.kind).toBe("CoreLet");
        expect(level3.pattern.name).toBe("c");

        const finalExpr = level3.body;
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
        expect((result as any).mutable).toBe(true);
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
        expect((result as any).recursive).toBe(true);
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
        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.name).toBe("x");

        // Value should be a desugared inner block (let a = 5 in a)
        const value = (result as any).value;
        expect(value.kind).toBe("CoreLet");
        expect(value.pattern.name).toBe("a");
        expect(value.value.value).toBe(5);
        expect(value.body.kind).toBe("CoreVar");
        expect(value.body.name).toBe("a");
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

        expect(result.kind).toBe("CoreLet");
        const body = (result as any).body;
        expect(body.kind).toBe("CoreBinOp");
        expect(body.op).toBe("Multiply");
        expect(body.right.kind).toBe("CoreBinOp");
        expect(body.right.op).toBe("Add");
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

        expect(result.kind).toBe("CoreLet");
        const value = (result as any).value;
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

        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.kind).toBe("CoreVariantPattern");
        expect((result as any).pattern.constructor).toBe("Some");
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

        expect(result.kind).toBe("CoreLet");
        expect((result as any).pattern.kind).toBe("CoreRecordPattern");
        expect((result as any).pattern.fields).toHaveLength(2);
    });
});
