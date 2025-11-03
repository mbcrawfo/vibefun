/**
 * Tests for the desugarer foundation
 */

import type { Expr, Location, Module, Pattern } from "../types/ast.js";
import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreFloatLit,
    CoreIntLit,
    CoreLet,
    CoreLiteralPattern,
    CoreMatch,
    CoreRecord,
    CoreRecordAccess,
    CoreRecordPattern,
    CoreStringLit,
    CoreTypeAnnotation,
    CoreUnaryOp,
    CoreUnsafe,
    CoreVar,
    CoreVariantPattern,
    CoreVarPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar, desugarModule, desugarPattern } from "./desugarer.js";
import { DesugarError } from "./DesugarError.js";
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

describe("DesugarError", () => {
    it("should create error with location", () => {
        const error = new DesugarError("Test error", testLoc);

        expect(error.message).toBe("Test error");
        expect(error.loc).toBe(testLoc);
        expect(error.name).toBe("DesugarError");
    });

    it("should format error with location", () => {
        const error = new DesugarError("Test error", testLoc);
        const formatted = error.format();

        expect(formatted).toContain("Error: Test error");
        expect(formatted).toContain("test.vf:1:1");
    });

    it("should include hint in formatted output", () => {
        const error = new DesugarError("Test error", testLoc, "Try this instead");
        const formatted = error.format();

        expect(formatted).toContain("Hint: Try this instead");
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
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: { kind: "IntLit", value: 42, loc: testLoc },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = desugar(expr);
        const letResult = result as CoreLet;

        expect(result.kind).toBe("CoreLet");
        expect(letResult.pattern.kind).toBe("CoreVarPattern");
        expect(letResult.value.kind).toBe("CoreIntLit");
        expect(letResult.body.kind).toBe("CoreVar");
        expect(letResult.mutable).toBe(false);
        expect(letResult.recursive).toBe(false);
    });

    it("should preserve mutable flag", () => {
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

        expect((result as CoreLet).mutable).toBe(true);
    });

    it("should preserve recursive flag", () => {
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

        expect((result as CoreLet).recursive).toBe(true);
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

    it("should desugar multi-argument applications", () => {
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

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).args).toHaveLength(2);
    });
});

describe("Desugarer - Match Expressions", () => {
    it("should desugar match expressions", () => {
        const expr: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: { kind: "LiteralPattern", literal: 0, loc: testLoc },
                    body: { kind: "StringLit", value: "zero", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);
        const match = result as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        expect(match.expr.kind).toBe("CoreVar");
        expect(match.cases[0]!.pattern.kind).toBe("CoreLiteralPattern");
        expect(match.cases[0]!.body.kind).toBe("CoreStringLit");
    });

    it("should desugar match with guards", () => {
        const expr: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "x", loc: testLoc },
            cases: [
                {
                    pattern: { kind: "VarPattern", name: "n", loc: testLoc },
                    guard: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "n", loc: testLoc },
                        right: { kind: "IntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "positive", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);
        const match = result as CoreMatch;
        const guard = match.cases[0]!.guard;

        expect(result.kind).toBe("CoreMatch");
        expect(guard).toBeDefined();
        expect(guard!.kind).toBe("CoreBinOp");
    });
});

describe("Desugarer - Records", () => {
    it("should desugar record literals", () => {
        const expr: Expr = {
            kind: "Record",
            fields: [
                {
                    kind: "Field",
                    name: "x",
                    value: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                {
                    kind: "Field",
                    name: "y",
                    value: { kind: "IntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);
        const record = result as CoreRecord;

        expect(result.kind).toBe("CoreRecord");
        expect(record.fields).toHaveLength(2);
        expect((record.fields[0]! as { name: string }).name).toBe("x");
        expect((record.fields[0]! as { value: { kind: string } }).value.kind).toBe("CoreIntLit");
    });

    it("should desugar record access", () => {
        const expr: Expr = {
            kind: "RecordAccess",
            record: { kind: "Var", name: "point", loc: testLoc },
            field: "x",
            loc: testLoc,
        };

        const result = desugar(expr);
        const access = result as CoreRecordAccess;

        expect(result.kind).toBe("CoreRecordAccess");
        expect(access.record.kind).toBe("CoreVar");
        expect(access.field).toBe("x");
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
                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                value: { kind: "IntLit", value: 42, loc: testLoc },
                body: { kind: "Var", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreUnsafe");
        expect((result as CoreUnsafe).expr.kind).toBe("CoreLet");
    });
});

describe("Desugarer - Patterns", () => {
    it("should desugar variable patterns", () => {
        const pattern: Pattern = {
            kind: "VarPattern",
            name: "x",
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreVarPattern");
        expect((result as CoreVarPattern).name).toBe("x");
    });

    it("should desugar wildcard patterns", () => {
        const pattern: Pattern = {
            kind: "WildcardPattern",
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreWildcardPattern");
    });

    it("should desugar literal patterns", () => {
        const pattern: Pattern = {
            kind: "LiteralPattern",
            literal: 42,
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);

        expect(result.kind).toBe("CoreLiteralPattern");
        expect((result as CoreLiteralPattern).literal).toBe(42);
    });

    it("should desugar constructor patterns", () => {
        const pattern: Pattern = {
            kind: "ConstructorPattern",
            constructor: "Some",
            args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);
        const variantPat = result as CoreVariantPattern;

        expect(result.kind).toBe("CoreVariantPattern");
        expect(variantPat.constructor).toBe("Some");
        expect(variantPat.args[0]!.kind).toBe("CoreVarPattern");
    });

    it("should desugar record patterns", () => {
        const pattern: Pattern = {
            kind: "RecordPattern",
            fields: [
                {
                    name: "x",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const gen = new FreshVarGen();
        const result = desugarPattern(pattern, gen);
        const recordPat = result as CoreRecordPattern;

        expect(result.kind).toBe("CoreRecordPattern");
        expect((recordPat.fields[0]! as { name: string }).name).toBe("x");
        expect(recordPat.fields[0]!.pattern.kind).toBe("CoreVarPattern");
    });
});

describe("Desugarer - Module", () => {
    it("should desugar empty module", () => {
        const module: Module = {
            imports: [],
            declarations: [],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.imports).toHaveLength(0);
        expect(result.declarations).toHaveLength(0);
    });

    it("should desugar module with let declarations", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    mutable: false,
                    recursive: false,
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0]!.kind).toBe("CoreLetDecl");
    });

    it("should desugar module with imports", () => {
        const module: Module = {
            imports: [
                {
                    kind: "ImportDecl",
                    items: [{ name: "Option", isType: true }],
                    from: "./option",
                    loc: testLoc,
                },
            ],
            declarations: [],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0]!.kind).toBe("CoreImportDecl");
        expect(result.imports[0]!.items[0]!.name).toBe("Option");
    });

    it("should desugar module with multiple let declarations", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 1, loc: testLoc },
                    mutable: false,
                    recursive: false,
                    exported: false,
                    loc: testLoc,
                },
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                    value: { kind: "IntLit", value: 2, loc: testLoc },
                    mutable: false,
                    recursive: false,
                    exported: false,
                    loc: testLoc,
                },
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "z", loc: testLoc },
                    value: { kind: "IntLit", value: 3, loc: testLoc },
                    mutable: false,
                    recursive: false,
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(3);
        expect(result.declarations[0]!.kind).toBe("CoreLetDecl");
        expect(result.declarations[1]!.kind).toBe("CoreLetDecl");
        expect(result.declarations[2]!.kind).toBe("CoreLetDecl");
    });

    it("should desugar module with type declarations", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "TypeDecl",
                    name: "Option",
                    params: ["T"],
                    definition: {
                        kind: "VariantTypeDef",
                        constructors: [
                            {
                                name: "Some",
                                args: [{ kind: "TypeVar", name: "T", loc: testLoc }],
                                loc: testLoc,
                            },
                            { name: "None", args: [], loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0]!.kind).toBe("CoreTypeDecl");
    });

    it("should desugar module with external declarations", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "ExternalDecl",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0]!.kind).toBe("CoreExternalDecl");
    });

    it("should desugar module with external type declarations", () => {
        const module: Module = {
            imports: [],
            declarations: [
                {
                    kind: "ExternalTypeDecl",
                    name: "Promise",
                    typeExpr: { kind: "TypeConst", name: "external", loc: testLoc },
                    exported: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0]!.kind).toBe("CoreExternalTypeDecl");
    });

    it("should desugar module with mixed declaration types", () => {
        const module: Module = {
            imports: [
                {
                    kind: "ImportDecl",
                    items: [{ name: "Option", isType: true }],
                    from: "./option",
                    loc: testLoc,
                },
            ],
            declarations: [
                {
                    kind: "TypeDecl",
                    name: "Result",
                    params: ["T", "E"],
                    definition: {
                        kind: "VariantTypeDef",
                        constructors: [
                            {
                                name: "Ok",
                                args: [{ kind: "TypeVar", name: "T", loc: testLoc }],
                                loc: testLoc,
                            },
                            {
                                name: "Err",
                                args: [{ kind: "TypeVar", name: "E", loc: testLoc }],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    exported: true,
                    loc: testLoc,
                },
                {
                    kind: "ExternalDecl",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    exported: false,
                    loc: testLoc,
                },
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                    value: { kind: "IntLit", value: 42, loc: testLoc },
                    mutable: false,
                    recursive: false,
                    exported: true,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        expect(result.imports).toHaveLength(1);
        expect(result.declarations).toHaveLength(3);
        expect(result.declarations[0]!.kind).toBe("CoreTypeDecl");
        expect(result.declarations[1]!.kind).toBe("CoreExternalDecl");
        expect(result.declarations[2]!.kind).toBe("CoreLetDecl");
    });
});
