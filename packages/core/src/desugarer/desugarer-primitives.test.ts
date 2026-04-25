/**
 * Tests for the desugarer foundation - primitive/linear constructs
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreFloatLit,
    CoreIntLit,
    CoreLet,
    CoreStringLit,
    CoreTypeAnnotation,
    CoreUnaryOp,
    CoreUnsafe,
    CoreVar,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";
import { FreshVarGen } from "./FreshVarGen.js";

// Helper to create test location
const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("FreshVarGen", () => {
    it("should generate fresh variable names with counter", () => {
        const gen = new FreshVarGen();

        expect(gen.fresh("tmp")).toBe("$tmp0");
        expect(gen.fresh("tmp")).toBe("$tmp1");
        expect(gen.fresh("tmp")).toBe("$tmp2");
    });

    it("should use custom prefix", () => {
        const gen = new FreshVarGen();

        expect(gen.fresh("composed")).toBe("$composed0");
        expect(gen.fresh("piped")).toBe("$piped1");
    });

    it("should reset counter", () => {
        const gen = new FreshVarGen();

        gen.fresh("tmp"); // $tmp0
        gen.fresh("tmp"); // $tmp1
        gen.reset();
        expect(gen.fresh("tmp")).toBe("$tmp0");
    });
});

describe("Desugarer - Literals", () => {
    it("should desugar integer literals", () => {
        const expr: Expr = {
            kind: "IntLit",
            value: 42,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreIntLit");
        expect((result as CoreIntLit).value).toBe(42);
        expect(result.loc).toBe(testLoc);
    });

    it("should desugar float literals", () => {
        const expr: Expr = {
            kind: "FloatLit",
            value: 3.14,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreFloatLit");
        expect((result as CoreFloatLit).value).toBe(3.14);
        expect(result.loc).toBe(testLoc);
    });

    it("should desugar string literals", () => {
        const expr: Expr = {
            kind: "StringLit",
            value: "hello",
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreStringLit");
        expect((result as CoreStringLit).value).toBe("hello");
        expect(result.loc).toBe(testLoc);
    });

    it("should desugar boolean literals", () => {
        const expr: Expr = {
            kind: "BoolLit",
            value: true,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreBoolLit");
        expect((result as CoreBoolLit).value).toBe(true);
        expect(result.loc).toBe(testLoc);
    });

    it("should desugar unit literals", () => {
        const expr: Expr = {
            kind: "UnitLit",
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnitLit");
        expect(result.loc).toBe(testLoc);
    });
});

describe("Desugarer - Variables", () => {
    it("should desugar variable references", () => {
        const expr: Expr = {
            kind: "Var",
            name: "x",
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreVar");
        expect((result as CoreVar).name).toBe("x");
        expect(result.loc).toBe(testLoc);
    });
});

describe("Desugarer - Let Bindings", () => {
    it("should desugar let bindings", () => {
        const expr: Expr = {
            kind: "Let",
            recursive: false,
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: false,
            loc: testLoc,
        };

        const result = desugar(expr);
        const letResult = result as CoreLet;

        expect(result.kind).toBe("CoreLet");
        expect(letResult.pattern.kind).toBe("CoreVarPattern");
        expect(letResult.value.kind).toBe("CoreIntLit");
        expect(letResult.body.kind).toBe("CoreVar");
        expect(letResult.mutable).toBe(false);
    });

    it("should preserve mutable flag", () => {
        const expr: Expr = {
            kind: "Let",
            recursive: false,
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: true,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect((result as CoreLet).mutable).toBe(true);
    });

    it("should lower recursive let into CoreLetRecExpr", () => {
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "f", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "f", loc: testLoc },
            mutable: false,
            recursive: true,
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreLetRecExpr");
    });
});

describe("Desugarer - Function Application", () => {
    it("should desugar function applications", () => {
        const expr: Expr = {
            kind: "App",
            func: { kind: "Var", name: "f", loc: testLoc },
            args: [{ kind: "IntLit", value: 42, loc: testLoc }],
            loc: testLoc,
        };

        const result = desugar(expr);
        const app = result as CoreApp;

        expect(result.kind).toBe("CoreApp");
        expect(app.func.kind).toBe("CoreVar");
        expect(app.args[0]!.kind).toBe("CoreIntLit");
    });

    it("should desugar multi-argument applications into curried applications", () => {
        // add(1, 2) desugars to (add(1))(2)
        const expr: Expr = {
            kind: "App",
            func: { kind: "Var", name: "add", loc: testLoc },
            args: [
                { kind: "IntLit", value: 1, loc: testLoc },
                { kind: "IntLit", value: 2, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);
        const outer = result as CoreApp;

        expect(outer.kind).toBe("CoreApp");
        expect(outer.args).toHaveLength(1);
        expect(outer.args[0]!.kind).toBe("CoreIntLit");
        expect((outer.args[0] as { value: number }).value).toBe(2);

        // Inner: add(1)
        const inner = outer.func as CoreApp;
        expect(inner.kind).toBe("CoreApp");
        expect(inner.func.kind).toBe("CoreVar");
        expect(inner.args).toHaveLength(1);
        expect(inner.args[0]!.kind).toBe("CoreIntLit");
        expect((inner.args[0] as { value: number }).value).toBe(1);
    });

    it("should desugar three-argument applications into nested curried applications", () => {
        // add3(1, 2, 3) desugars to ((add3(1))(2))(3)
        const expr: Expr = {
            kind: "App",
            func: { kind: "Var", name: "add3", loc: testLoc },
            args: [
                { kind: "IntLit", value: 1, loc: testLoc },
                { kind: "IntLit", value: 2, loc: testLoc },
                { kind: "IntLit", value: 3, loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);
        const level3 = result as CoreApp;
        expect((level3.args[0] as { value: number }).value).toBe(3);

        const level2 = level3.func as CoreApp;
        expect((level2.args[0] as { value: number }).value).toBe(2);

        const level1 = level2.func as CoreApp;
        expect((level1.args[0] as { value: number }).value).toBe(1);
        expect(level1.func.kind).toBe("CoreVar");
    });

    it("should desugar zero-argument applications to App(func, unit)", () => {
        // f() desugars to f(unit)
        const expr: Expr = {
            kind: "App",
            func: { kind: "Var", name: "f", loc: testLoc },
            args: [],
            loc: testLoc,
        };

        const result = desugar(expr);
        const app = result as CoreApp;

        expect(app.kind).toBe("CoreApp");
        expect(app.func.kind).toBe("CoreVar");
        expect(app.args).toHaveLength(1);
        expect(app.args[0]!.kind).toBe("CoreUnitLit");
    });
});

describe("Desugarer - Binary Operations", () => {
    it("should desugar arithmetic operations", () => {
        const expr: Expr = {
            kind: "BinOp",
            op: "Add",
            left: { kind: "IntLit", value: 1, loc: testLoc },
            right: { kind: "IntLit", value: 2, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);
        const binOp = result as CoreBinOp;

        expect(result.kind).toBe("CoreBinOp");
        expect(binOp.op).toBe("Add");
        expect(binOp.left.kind).toBe("CoreIntLit");
        expect(binOp.right.kind).toBe("CoreIntLit");
    });

    it("should desugar comparison operations", () => {
        const expr: Expr = {
            kind: "BinOp",
            op: "LessThan",
            left: { kind: "Var", name: "x", loc: testLoc },
            right: { kind: "IntLit", value: 10, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreBinOp");
        expect((result as CoreBinOp).op).toBe("LessThan");
    });

    it("should desugar logical operations", () => {
        const expr: Expr = {
            kind: "BinOp",
            op: "LogicalAnd",
            left: { kind: "BoolLit", value: true, loc: testLoc },
            right: { kind: "BoolLit", value: false, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreBinOp");
        expect((result as CoreBinOp).op).toBe("LogicalAnd");
    });
});

describe("Desugarer - Unary Operations", () => {
    it("should desugar negation", () => {
        const expr: Expr = {
            kind: "UnaryOp",
            op: "Negate",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);
        const unaryOp = result as CoreUnaryOp;

        expect(result.kind).toBe("CoreUnaryOp");
        expect(unaryOp.op).toBe("Negate");
        expect(unaryOp.expr.kind).toBe("CoreIntLit");
    });

    it("should desugar logical not", () => {
        const expr: Expr = {
            kind: "UnaryOp",
            op: "LogicalNot",
            expr: { kind: "BoolLit", value: true, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnaryOp");
        expect((result as CoreUnaryOp).op).toBe("LogicalNot");
    });

    it("should desugar dereference", () => {
        const expr: Expr = {
            kind: "UnaryOp",
            op: "Deref",
            expr: { kind: "Var", name: "ref", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnaryOp");
        expect((result as CoreUnaryOp).op).toBe("Deref");
    });
});

describe("Desugarer - Type Annotations", () => {
    it("should preserve type annotations", () => {
        const expr: Expr = {
            kind: "TypeAnnotation",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreTypeAnnotation");
        expect((result as CoreTypeAnnotation).expr.kind).toBe("CoreIntLit");
    });
});

describe("Desugarer - Unsafe Blocks", () => {
    it("should desugar unsafe blocks", () => {
        const expr: Expr = {
            kind: "Unsafe",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        expect((result as CoreUnsafe).expr.kind).toBe("CoreIntLit");
    });

    it("should desugar contents of unsafe blocks", () => {
        const expr: Expr = {
            kind: "Unsafe",
            expr: {
                kind: "Let",
                recursive: false,
                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                value: { kind: "IntLit", value: 42, loc: testLoc },
                body: { kind: "Var", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        expect((result as CoreUnsafe).expr.kind).toBe("CoreLet");
    });
});
