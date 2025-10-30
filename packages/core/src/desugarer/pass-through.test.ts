/**
 * Tests for pass-through transformations
 *
 * These transformations mostly preserve their structure but desugar their contents:
 * - Mutable references (Let with mutable: true, RefAssign, Deref)
 * - Type annotations
 * - Unsafe blocks
 * - External blocks (expand to multiple declarations)
 */

import type { Declaration, Expr, Location, Module } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar, desugarDecl, desugarModule, FreshVarGen } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Mutable References - Let Bindings", () => {
    it("should preserve mutable flag in let binding", () => {
        // let mut x = 42 in x
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: true,
            recursive: false,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreLet");
        expect((result as CoreExpr).mutable).toBe(true);
        expect((result as CoreExpr).value.kind).toBe("CoreIntLit");
        expect((result as CoreExpr).body.kind).toBe("CoreVar");
    });

    it("should preserve immutable flag in let binding", () => {
        // let x = 42 in x
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreLet");
        expect((result as CoreExpr).mutable).toBe(false);
    });

    it("should preserve recursive flag in let binding", () => {
        // let rec fact = (n) => if n == 0 then 1 else n * fact(n - 1) in fact
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "fact", loc: testLoc },
            value: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "n", loc: testLoc }],
                body: { kind: "IntLit", value: 1, loc: testLoc }, // Simplified
                loc: testLoc,
            },
            body: { kind: "Var", name: "fact", loc: testLoc },
            mutable: false,
            recursive: true,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreLet");
        expect((result as CoreExpr).recursive).toBe(true);
    });
});

describe("Mutable References - Operators", () => {
    it("should desugar reference assignment (RefAssign)", () => {
        // x := 42
        const expr: Expr = {
            kind: "BinOp",
            op: "RefAssign",
            left: { kind: "Var", name: "x", loc: testLoc },
            right: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreBinOp");
        expect((result as CoreExpr).op).toBe("RefAssign");
        expect((result as CoreExpr).left.kind).toBe("CoreVar");
        expect((result as CoreExpr).right.kind).toBe("CoreIntLit");
    });

    it("should desugar dereference (Deref)", () => {
        // !x
        const expr: Expr = {
            kind: "UnaryOp",
            op: "Deref",
            expr: { kind: "Var", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnaryOp");
        expect((result as CoreExpr).op).toBe("Deref");
        expect((result as CoreExpr).expr.kind).toBe("CoreVar");
    });

    it("should desugar complex ref assignment", () => {
        // x := y + 1
        const expr: Expr = {
            kind: "BinOp",
            op: "RefAssign",
            left: { kind: "Var", name: "x", loc: testLoc },
            right: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "y", loc: testLoc },
                right: { kind: "IntLit", value: 1, loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreBinOp");
        expect((result as CoreExpr).op).toBe("RefAssign");
        expect((result as CoreExpr).right.kind).toBe("CoreBinOp");
        expect((result as CoreExpr).right.op).toBe("Add");
    });
});

describe("Type Annotations", () => {
    it("should preserve type annotation and desugar expression", () => {
        // (42 : Int)
        const expr: Expr = {
            kind: "TypeAnnotation",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreTypeAnnotation");
        expect((result as CoreExpr).expr.kind).toBe("CoreIntLit");
        expect((result as CoreExpr).typeExpr.kind).toBe("CoreTypeConst");
    });

    it("should desugar complex expression with type annotation", () => {
        // (x + y : Int)
        const expr: Expr = {
            kind: "TypeAnnotation",
            expr: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "Var", name: "y", loc: testLoc },
                loc: testLoc,
            },
            typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreTypeAnnotation");
        expect((result as CoreExpr).expr.kind).toBe("CoreBinOp");
    });

    it("should desugar lambda with type annotation", () => {
        // ((x, y) => x + y : (Int, Int) -> Int)
        const expr: Expr = {
            kind: "TypeAnnotation",
            expr: {
                kind: "Lambda",
                params: [
                    { kind: "VarPattern", name: "x", loc: testLoc },
                    { kind: "VarPattern", name: "y", loc: testLoc },
                ],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "Var", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreTypeAnnotation");
        // Lambda should be curried inside
        expect((result as CoreExpr).expr.kind).toBe("CoreLambda");
    });
});

describe("Unsafe Blocks", () => {
    it("should preserve unsafe boundary and desugar contents", () => {
        // unsafe { 42 }
        const expr: Expr = {
            kind: "Unsafe",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        expect((result as CoreExpr).expr.kind).toBe("CoreIntLit");
    });

    it("should desugar complex expression inside unsafe", () => {
        // unsafe { x + y }
        const expr: Expr = {
            kind: "Unsafe",
            expr: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "Var", name: "y", loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        expect((result as CoreExpr).expr.kind).toBe("CoreBinOp");
    });

    it("should desugar block inside unsafe", () => {
        // unsafe { let x = 10; x + 1 }
        const expr: Expr = {
            kind: "Unsafe",
            expr: {
                kind: "Block",
                exprs: [
                    {
                        kind: "Let",
                        pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                        value: { kind: "IntLit", value: 10, loc: testLoc },
                        body: {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "x", loc: testLoc },
                            right: { kind: "IntLit", value: 1, loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        // Block should be desugared to CoreLet
        expect((result as CoreExpr).expr.kind).toBe("CoreLet");
    });

    it("should desugar if-then-else inside unsafe", () => {
        // unsafe { if cond then 1 else 2 }
        const expr: Expr = {
            kind: "Unsafe",
            expr: {
                kind: "If",
                condition: { kind: "Var", name: "cond", loc: testLoc },
                then: { kind: "IntLit", value: 1, loc: testLoc },
                else_: { kind: "IntLit", value: 2, loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        // If should be desugared to CoreMatch
        expect((result as CoreExpr).expr.kind).toBe("CoreMatch");
    });
});

describe("External Blocks", () => {
    it("should expand external block with single value", () => {
        // external { log: (String) -> Unit = "console.log" } from "console"
        const decl: Declaration = {
            kind: "ExternalBlock",
            items: [
                {
                    kind: "ExternalValue",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    loc: testLoc,
                },
            ],
            from: "console",
            exported: false,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarDecl(decl, gen);

        expect(Array.isArray(result)).toBe(true);
        expect((result as CoreExpr[]).length).toBe(1);
        expect((result as CoreExpr[])[0].kind).toBe("CoreExternalDecl");
        expect((result as CoreExpr[])[0].name).toBe("log");
        expect((result as CoreExpr[])[0].from).toBe("console");
    });

    it("should expand external block with multiple values", () => {
        // external {
        //   log: (String) -> Unit = "console.log"
        //   warn: (String) -> Unit = "console.warn"
        // }
        const decl: Declaration = {
            kind: "ExternalBlock",
            items: [
                {
                    kind: "ExternalValue",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    loc: testLoc,
                },
                {
                    kind: "ExternalValue",
                    name: "warn",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.warn",
                    loc: testLoc,
                },
            ],
            exported: false,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarDecl(decl, gen);

        expect(Array.isArray(result)).toBe(true);
        expect((result as CoreExpr[]).length).toBe(2);
        expect((result as CoreExpr[])[0].name).toBe("log");
        expect((result as CoreExpr[])[1].name).toBe("warn");
    });

    it("should expand external block with types", () => {
        // external {
        //   type Foo = external
        //   type Bar = external
        // }
        const decl: Declaration = {
            kind: "ExternalBlock",
            items: [
                {
                    kind: "ExternalType",
                    name: "Foo",
                    typeExpr: { kind: "TypeConst", name: "external", loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "ExternalType",
                    name: "Bar",
                    typeExpr: { kind: "TypeConst", name: "external", loc: testLoc },
                    loc: testLoc,
                },
            ],
            exported: true,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarDecl(decl, gen);

        expect(Array.isArray(result)).toBe(true);
        expect((result as CoreExpr[]).length).toBe(2);
        expect((result as CoreExpr[])[0].kind).toBe("CoreExternalTypeDecl");
        expect((result as CoreExpr[])[1].kind).toBe("CoreExternalTypeDecl");
        expect((result as CoreExpr[])[0].exported).toBe(true);
        expect((result as CoreExpr[])[1].exported).toBe(true);
    });

    it("should expand external block with mixed values and types", () => {
        // external {
        //   log: (String) -> Unit = "console.log"
        //   type Logger = external
        //   warn: (String) -> Unit = "console.warn"
        // }
        const decl: Declaration = {
            kind: "ExternalBlock",
            items: [
                {
                    kind: "ExternalValue",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    loc: testLoc,
                },
                {
                    kind: "ExternalType",
                    name: "Logger",
                    typeExpr: { kind: "TypeConst", name: "external", loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "ExternalValue",
                    name: "warn",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.warn",
                    loc: testLoc,
                },
            ],
            exported: false,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarDecl(decl, gen);

        expect(Array.isArray(result)).toBe(true);
        expect((result as CoreExpr[]).length).toBe(3);
        expect((result as CoreExpr[])[0].kind).toBe("CoreExternalDecl");
        expect((result as CoreExpr[])[1].kind).toBe("CoreExternalTypeDecl");
        expect((result as CoreExpr[])[2].kind).toBe("CoreExternalDecl");
    });

    it("should preserve exported flag from block to all items", () => {
        // export external { log: ... }
        const decl: Declaration = {
            kind: "ExternalBlock",
            items: [
                {
                    kind: "ExternalValue",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    loc: testLoc,
                },
            ],
            exported: true,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarDecl(decl, gen);

        expect((result as CoreExpr[])[0].exported).toBe(true);
    });
});

describe("Pass-Through - Integration", () => {
    it("should handle mutable let in module", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    mutable: true,
                    recursive: false,
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0].kind).toBe("CoreLetDecl");
        expect((result.declarations[0] as CoreExpr).mutable).toBe(true);
    });

    it("should expand external block in module", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "ExternalBlock",
                    items: [
                        {
                            kind: "ExternalValue",
                            name: "log",
                            typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                            jsName: "console.log",
                            loc: testLoc,
                        },
                        {
                            kind: "ExternalValue",
                            name: "warn",
                            typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                            jsName: "console.warn",
                            loc: testLoc,
                        },
                    ],
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        // External block should expand to 2 declarations
        expect(result.declarations).toHaveLength(2);
        expect(result.declarations[0].kind).toBe("CoreExternalDecl");
        expect(result.declarations[1].kind).toBe("CoreExternalDecl");
    });
});
