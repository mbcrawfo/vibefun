/**
 * Tests for pipe operator desugaring
 *
 * Pipe operator is desugared to function application:
 * data |> f => f(data)
 * data |> f |> g => g(f(data))  (left-associative)
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreApp } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Pipe Operator - Basic Cases", () => {
    it("should desugar simple pipe", () => {
        // data |> f
        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe);

        // Should become: f(data)
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.kind).toBe("CoreVar");
        expect((result as CoreApp).func.name).toBe("f");
        expect((result as CoreApp).args).toHaveLength(1);
        expect((result as CoreApp).args[0].kind).toBe("CoreVar");
        expect((result as CoreApp).args[0].name).toBe("data");
    });

    it("should desugar pipe with literal", () => {
        // 42 |> f
        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "IntLit", value: 42, loc: testLoc },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe);

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).args[0].kind).toBe("CoreIntLit");
        expect((result as CoreApp).args[0].value).toBe(42);
    });
});

describe("Pipe Operator - Chained Pipes", () => {
    it("should desugar two-stage pipe", () => {
        // data |> f |> g
        // Parser creates: Pipe(Pipe(data, f), g)
        const innerPipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: testLoc,
        };

        const outerPipe: Expr = {
            kind: "Pipe",
            expr: innerPipe,
            func: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(outerPipe);

        // Should become: g(f(data))
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.name).toBe("g");

        const arg = (result as CoreApp).args[0];
        expect(arg.kind).toBe("CoreApp");
        expect(arg.func.name).toBe("f");
        expect(arg.args[0].name).toBe("data");
    });

    it("should desugar three-stage pipe", () => {
        // data |> f |> g |> h
        // Parser: Pipe(Pipe(Pipe(data, f), g), h)
        const pipe1: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: testLoc,
        };

        const pipe2: Expr = {
            kind: "Pipe",
            expr: pipe1,
            func: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const pipe3: Expr = {
            kind: "Pipe",
            expr: pipe2,
            func: { kind: "Var", name: "h", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe3);

        // Should become: h(g(f(data)))
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.name).toBe("h");

        const arg1 = (result as CoreApp).args[0];
        expect(arg1.kind).toBe("CoreApp");
        expect(arg1.func.name).toBe("g");

        const arg2 = arg1.args[0];
        expect(arg2.kind).toBe("CoreApp");
        expect(arg2.func.name).toBe("f");
        expect(arg2.args[0].name).toBe("data");
    });
});

describe("Pipe Operator - With Function Applications", () => {
    it("should desugar pipe with partially applied function", () => {
        // data |> filter(pred)
        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: {
                kind: "App",
                func: { kind: "Var", name: "filter", loc: testLoc },
                args: [{ kind: "Var", name: "pred", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(pipe);

        // Should become: filter(pred)(data)
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.kind).toBe("CoreApp");
        expect((result as CoreApp).func.func.name).toBe("filter");
        expect((result as CoreApp).args[0].name).toBe("data");
    });

    it("should desugar pipe chain with partial applications", () => {
        // data |> filter(pred) |> map(transform)
        const pipe1: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: {
                kind: "App",
                func: { kind: "Var", name: "filter", loc: testLoc },
                args: [{ kind: "Var", name: "pred", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const pipe2: Expr = {
            kind: "Pipe",
            expr: pipe1,
            func: {
                kind: "App",
                func: { kind: "Var", name: "map", loc: testLoc },
                args: [{ kind: "Var", name: "transform", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(pipe2);

        // Should become: map(transform)(filter(pred)(data))
        expect(result.kind).toBe("CoreApp");
        const mapCall = result as CoreApp;
        expect(mapCall.func.kind).toBe("CoreApp");
        expect(mapCall.func.func.name).toBe("map");

        const filterResult = mapCall.args[0];
        expect(filterResult.kind).toBe("CoreApp");
        expect(filterResult.func.kind).toBe("CoreApp");
        expect(filterResult.func.func.name).toBe("filter");
    });
});

describe("Pipe Operator - With Lambdas", () => {
    it("should desugar pipe with lambda", () => {
        // data |> ((x) => x + 1)
        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(pipe);

        // Should become: ((x) => x + 1)(data)
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.kind).toBe("CoreLambda");
        expect((result as CoreApp).args[0].name).toBe("data");
    });

    it("should desugar chained pipes with lambdas", () => {
        // data |> ((x) => x + 1) |> ((y) => y * 2)
        const pipe1: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const pipe2: Expr = {
            kind: "Pipe",
            expr: pipe1,
            func: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "y", loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Multiply",
                    left: { kind: "Var", name: "y", loc: testLoc },
                    right: { kind: "IntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(pipe2);

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.kind).toBe("CoreLambda");
    });
});

describe("Pipe Operator - Complex Expressions", () => {
    it("should desugar pipe with complex left expression", () => {
        // (x + y) |> f
        const pipe: Expr = {
            kind: "Pipe",
            expr: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "Var", name: "y", loc: testLoc },
                loc: testLoc,
            },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe);

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).args[0].kind).toBe("CoreBinOp");
    });

    it("should desugar pipe with complex function expression", () => {
        // data |> (if cond then f else g)
        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: {
                kind: "If",
                condition: { kind: "Var", name: "cond", loc: testLoc },
                then: { kind: "Var", name: "f", loc: testLoc },
                else_: { kind: "Var", name: "g", loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(pipe);

        // Should be: (match cond { | true => f | false => g })(data)
        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).func.kind).toBe("CoreMatch");
        expect((result as CoreApp).args[0].kind).toBe("CoreVar");
        expect((result as CoreApp).args[0].name).toBe("data");
    });
});

describe("Pipe Operator - With Records", () => {
    it("should desugar pipe with record access", () => {
        // person.age |> toString
        const pipe: Expr = {
            kind: "Pipe",
            expr: {
                kind: "RecordAccess",
                record: { kind: "Var", name: "person", loc: testLoc },
                field: "age",
                loc: testLoc,
            },
            func: { kind: "Var", name: "toString", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe);

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).args[0].kind).toBe("CoreRecordAccess");
    });

    it("should desugar pipe with record literal", () => {
        // { x: 1, y: 2 } |> processPoint
        const pipe: Expr = {
            kind: "Pipe",
            expr: {
                kind: "Record",
                fields: [
                    {
                        name: "x",
                        value: { kind: "IntLit", value: 1, loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        name: "y",
                        value: { kind: "IntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            func: { kind: "Var", name: "processPoint", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(pipe);

        expect(result.kind).toBe("CoreApp");
        expect((result as CoreApp).args[0].kind).toBe("CoreRecord");
    });
});

describe("Pipe Operator - Source Locations", () => {
    it("should preserve source locations", () => {
        const pipeLoc: Location = {
            file: "test.vf",
            line: 100,
            column: 20,
            offset: 1000,
        };

        const pipe: Expr = {
            kind: "Pipe",
            expr: { kind: "Var", name: "data", loc: testLoc },
            func: { kind: "Var", name: "f", loc: testLoc },
            loc: pipeLoc,
        };

        const result = desugar(pipe);

        expect(result.loc).toBe(pipeLoc);
    });
});
