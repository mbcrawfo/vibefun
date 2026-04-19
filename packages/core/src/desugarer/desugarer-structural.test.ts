/**
 * Tests for the desugarer foundation - structural/branching constructs
 */

import type { Expr, Location, Module, Pattern } from "../types/ast.js";
import type {
    CoreLiteralPattern,
    CoreMatch,
    CoreRecord,
    CoreRecordAccess,
    CoreRecordPattern,
    CoreVariantPattern,
    CoreVarPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar, desugarModule, desugarPattern } from "./desugarer.js";
import { FreshVarGen } from "./FreshVarGen.js";

// Helper to create test location
const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

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
