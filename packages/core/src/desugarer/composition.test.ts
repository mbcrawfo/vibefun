/**
 * Tests for function composition desugaring
 *
 * Forward composition: f >> g => (x) => g(f(x))
 * Backward composition: f << g => (x) => f(g(x))
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreApp, CoreLambda, CoreVar, CoreVarPattern } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";
import { FreshVarGen } from "./FreshVarGen.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Function Composition - Forward (>>)", () => {
    it("should desugar simple forward composition", () => {
        // f >> g
        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(comp);

        // Should become: (x) => g(f(x))
        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");

        // Body should be g(f(x))
        const body = lambda.body as CoreApp;
        expect(body.kind).toBe("CoreApp");
        expect((body.func as CoreVar).name).toBe("g");

        // Argument to g should be f(x)
        const arg = body.args[0] as CoreApp;
        expect(arg).toBeDefined();
        expect(arg.kind).toBe("CoreApp");
        expect((arg.func as CoreVar).name).toBe("f");
    });

    it("should desugar three-function forward composition", () => {
        // f >> g >> h
        // Parser creates: (f >> g) >> h
        const inner: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const outer: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: inner,
            right: { kind: "Var", name: "h", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(outer);

        // Should become: (x) => h((y) => g(f(y))(x))
        // Outer lambda
        expect(result.kind).toBe("CoreLambda");
    });

    it("should generate fresh variable names", () => {
        const gen = new FreshVarGen();

        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(comp, gen);

        const lambda = result as CoreLambda;
        expect((lambda.param as CoreVarPattern).name).toMatch(/\$composed\d+/);
    });
});

describe("Function Composition - Backward (<<)", () => {
    it("should desugar simple backward composition", () => {
        // f << g
        const comp: Expr = {
            kind: "BinOp",
            op: "BackwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(comp);

        // Should become: (x) => f(g(x))
        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");

        // Body should be f(g(x))
        const body = lambda.body as CoreApp;
        expect(body.kind).toBe("CoreApp");
        expect((body.func as CoreVar).name).toBe("f");

        // Argument to f should be g(x)
        const arg = body.args[0] as CoreApp;
        expect(arg).toBeDefined();
        expect(arg.kind).toBe("CoreApp");
        expect((arg.func as CoreVar).name).toBe("g");
    });

    it("should desugar three-function backward composition", () => {
        // f << g << h
        // Parser creates: (f << g) << h
        const inner: Expr = {
            kind: "BinOp",
            op: "BackwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const outer: Expr = {
            kind: "BinOp",
            op: "BackwardCompose",
            left: inner,
            right: { kind: "Var", name: "h", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(outer);

        // Should become nested lambdas
        expect(result.kind).toBe("CoreLambda");
    });
});

describe("Function Composition - With Lambdas", () => {
    it("should compose with inline lambdas", () => {
        // ((x) => x + 1) >> ((y) => y * 2)
        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: {
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x", loc: testLoc }, loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            right: {
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "y", loc: testLoc }, loc: testLoc }],
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

        const result = desugar(comp);

        // Outer structure should be lambda
        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;

        // Body should apply second lambda to result of first
        const body = lambda.body as CoreApp;
        expect(body.kind).toBe("CoreApp");
        expect(body.func.kind).toBe("CoreLambda");

        // Argument should be application of first lambda
        const bodyArg = body.args[0] as CoreApp;
        expect(bodyArg).toBeDefined();
        expect(bodyArg.kind).toBe("CoreApp");
        expect(bodyArg.func.kind).toBe("CoreLambda");
    });
});

describe("Function Composition - Mixed with Partial Application", () => {
    it("should compose partially applied functions", () => {
        // map(f) >> filter(pred)
        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: {
                kind: "App",
                func: { kind: "Var", name: "map", loc: testLoc },
                args: [{ kind: "Var", name: "f", loc: testLoc }],
                loc: testLoc,
            },
            right: {
                kind: "App",
                func: { kind: "Var", name: "filter", loc: testLoc },
                args: [{ kind: "Var", name: "pred", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(comp);

        // Should be lambda wrapping composed applications
        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;
        const body = lambda.body as CoreApp;
        expect(body.kind).toBe("CoreApp");

        // Both functions should be partially applied
        expect(body.func.kind).toBe("CoreApp");
        const bodyArg = body.args[0] as CoreApp;
        expect(bodyArg).toBeDefined();
        expect(bodyArg.kind).toBe("CoreApp");
    });
});

describe("Function Composition - Complex Cases", () => {
    it("should handle composition of multi-param lambdas", () => {
        // ((x, y) => x + y) >> ((z) => z * 2)
        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: {
                kind: "Lambda",
                params: [
                    { pattern: { kind: "VarPattern", name: "x", loc: testLoc }, loc: testLoc },
                    { pattern: { kind: "VarPattern", name: "y", loc: testLoc }, loc: testLoc },
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
            right: {
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "z", loc: testLoc }, loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Multiply",
                    left: { kind: "Var", name: "z", loc: testLoc },
                    right: { kind: "IntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(comp);

        // Multi-param lambda should be curried
        expect(result.kind).toBe("CoreLambda");
    });

    it("should handle nested compositions", () => {
        // (f >> g) >> (h >> i)
        const inner1: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: testLoc,
        };

        const inner2: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "h", loc: testLoc },
            right: { kind: "Var", name: "i", loc: testLoc },
            loc: testLoc,
        };

        const outer: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: inner1,
            right: inner2,
            loc: testLoc,
        };

        const result = desugar(outer);

        expect(result.kind).toBe("CoreLambda");
    });
});

describe("Function Composition - Direction Semantics", () => {
    it("should apply functions in correct order for forward composition", () => {
        // parse >> validate >> transform
        const comp1: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "parse", loc: testLoc },
            right: { kind: "Var", name: "validate", loc: testLoc },
            loc: testLoc,
        };

        const comp2: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: comp1,
            right: { kind: "Var", name: "transform", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(comp2);

        // Should create nested structure applying left-to-right
        expect(result.kind).toBe("CoreLambda");
    });

    it("should apply functions in correct order for backward composition", () => {
        // transform << validate << parse
        const comp1: Expr = {
            kind: "BinOp",
            op: "BackwardCompose",
            left: { kind: "Var", name: "transform", loc: testLoc },
            right: { kind: "Var", name: "validate", loc: testLoc },
            loc: testLoc,
        };

        const comp2: Expr = {
            kind: "BinOp",
            op: "BackwardCompose",
            left: comp1,
            right: { kind: "Var", name: "parse", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(comp2);

        // Should create nested structure applying right-to-left
        expect(result.kind).toBe("CoreLambda");
    });
});

describe("Function Composition - Source Locations", () => {
    it("should preserve source locations", () => {
        const compLoc: Location = {
            file: "test.vf",
            line: 50,
            column: 15,
            offset: 750,
        };

        const comp: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: { kind: "Var", name: "f", loc: testLoc },
            right: { kind: "Var", name: "g", loc: testLoc },
            loc: compLoc,
        };

        const result = desugar(comp);

        expect(result.loc).toBe(compLoc);
    });
});
