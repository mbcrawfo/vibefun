/**
 * Tests for while loop desugaring
 *
 * While loops are desugared to recursive functions:
 * while (cond) { body }
 * =>
 * let rec loop() = match cond { | true => { body; loop() } | false => () }
 * in loop()
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreApp, CoreLet, CoreLetRecExpr, CoreMatch } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("While Loop - Basic", () => {
    it("should desugar simple while loop to recursive function", () => {
        // while (x > 0) { print(x) }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "BinOp",
                op: "GreaterThan",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "IntLit", value: 0, loc: testLoc },
                loc: testLoc,
            },
            body: {
                kind: "App",
                func: { kind: "Var", name: "print", loc: testLoc },
                args: [{ kind: "Var", name: "x", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        // Should have one recursive binding
        expect(result.bindings).toHaveLength(1);
        // Recursive function named $loopN
        expect((result.bindings[0]!.pattern as { name: string }).name).toMatch(/^\$loop\d+$/);
        // Body should call the loop
        expect(result.body.kind).toBe("CoreApp");
        // Function value should be a lambda
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });

    it("should desugar while with simple boolean condition", () => {
        // while (running) { step() }
        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "Var", name: "running", loc: testLoc },
            body: {
                kind: "App",
                func: { kind: "Var", name: "step", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });
});

describe("While Loop - Nested Loops", () => {
    it("should desugar nested while loops", () => {
        // while (cond1) { while (cond2) { body } }
        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "Var", name: "cond1", loc: testLoc },
            body: {
                kind: "While",
                condition: { kind: "Var", name: "cond2", loc: testLoc },
                body: {
                    kind: "App",
                    func: { kind: "Var", name: "action", loc: testLoc },
                    args: [],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        // Outer loop is a recursive function
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
        // Successfully desugared nested loops
    });

    it("should desugar three nested while loops", () => {
        // while (a) { while (b) { while (c) { body } } }
        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "Var", name: "a", loc: testLoc },
            body: {
                kind: "While",
                condition: { kind: "Var", name: "b", loc: testLoc },
                body: {
                    kind: "While",
                    condition: { kind: "Var", name: "c", loc: testLoc },
                    body: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        // Should successfully desugar three levels
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });
});

describe("While Loop - Complex Conditions", () => {
    it("should desugar while with complex binary condition", () => {
        // while (x > 0 && y < 10) { action() }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "BinOp",
                op: "LogicalAnd",
                left: {
                    kind: "BinOp",
                    op: "GreaterThan",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 0, loc: testLoc },
                    loc: testLoc,
                },
                right: {
                    kind: "BinOp",
                    op: "LessThan",
                    left: { kind: "Var", name: "y", loc: testLoc },
                    right: { kind: "IntLit", value: 10, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            body: {
                kind: "App",
                func: { kind: "Var", name: "action", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });

    it("should desugar while with function call condition", () => {
        // while (hasNext()) { processNext() }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "App",
                func: { kind: "Var", name: "hasNext", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            body: {
                kind: "App",
                func: { kind: "Var", name: "processNext", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });

    it("should desugar while with negated condition", () => {
        // while (!done) { work() }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "UnaryOp",
                op: "LogicalNot",
                expr: { kind: "Var", name: "done", loc: testLoc },
                loc: testLoc,
            },
            body: {
                kind: "App",
                func: { kind: "Var", name: "work", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });
});

describe("While Loop - Empty and Simple Bodies", () => {
    it("should desugar while with unit body", () => {
        // while (true) { () }
        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "BoolLit", value: true, loc: testLoc },
            body: { kind: "UnitLit", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });

    it("should desugar while with single statement body", () => {
        // while (x > 0) { x }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "BinOp",
                op: "GreaterThan",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "IntLit", value: 0, loc: testLoc },
                loc: testLoc,
            },
            body: { kind: "Var", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
    });
});

describe("While Loop - Multi-Statement Body", () => {
    it("should desugar while with block body", () => {
        // while (x > 0) { let y = x * 2; print(y); x = x - 1 }
        const whileExpr: Expr = {
            kind: "While",
            condition: {
                kind: "BinOp",
                op: "GreaterThan",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "IntLit", value: 0, loc: testLoc },
                loc: testLoc,
            },
            body: {
                kind: "Block",
                exprs: [
                    {
                        kind: "Let",
                        pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                        value: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "x", loc: testLoc },
                            right: { kind: "IntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                        body: {
                            kind: "App",
                            func: { kind: "Var", name: "print", loc: testLoc },
                            args: [{ kind: "Var", name: "y", loc: testLoc }],
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

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        expect(result.bindings).toHaveLength(1);
        expect(result.bindings[0]!.value.kind).toBe("CoreLambda");
        // Block should be desugared in the body
    });
});

describe("While Loop - Return Value", () => {
    it("should verify while loop returns unit", () => {
        // while (cond) { action() }
        // The entire while expression should evaluate to unit
        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            body: {
                kind: "App",
                func: { kind: "Var", name: "action", loc: testLoc },
                args: [],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(whileExpr) as CoreLetRecExpr;

        expect(result.kind).toBe("CoreLetRecExpr");
        // The body is a call to the loop function
        expect(result.body.kind).toBe("CoreApp");
        // Loop is called with unit argument
        const app = result.body as CoreApp;
        expect(app.args).toHaveLength(1);
        expect(app.args[0]!.kind).toBe("CoreUnitLit");
    });
});

describe("While Loop - In Larger Context", () => {
    it("should desugar while loop in let binding", () => {
        // let x = while (cond) { action() } in x
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            value: {
                kind: "While",
                condition: { kind: "Var", name: "cond", loc: testLoc },
                body: {
                    kind: "App",
                    func: { kind: "Var", name: "action", loc: testLoc },
                    args: [],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            body: { kind: "Var", name: "x", loc: testLoc },
            mutable: false,
            recursive: false,
            loc: testLoc,
        };

        const result = desugar(expr) as CoreLet;

        expect(result.kind).toBe("CoreLet");
        // Value should be desugared while (which is CoreLetRecExpr)
        expect(result.value.kind).toBe("CoreLetRecExpr");
    });

    it("should desugar while loop in if expression", () => {
        // if (x > 0) then while (cond) { action() } else ()
        const expr: Expr = {
            kind: "If",
            condition: {
                kind: "BinOp",
                op: "GreaterThan",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "IntLit", value: 0, loc: testLoc },
                loc: testLoc,
            },
            then: {
                kind: "While",
                condition: { kind: "Var", name: "cond", loc: testLoc },
                body: {
                    kind: "App",
                    func: { kind: "Var", name: "action", loc: testLoc },
                    args: [],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            else_: { kind: "UnitLit", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr) as CoreMatch;

        expect(result.kind).toBe("CoreMatch");
        // Then branch should contain desugared while
        expect(result.cases[0]!.body.kind).toBe("CoreLetRecExpr");
    });
});

describe("While Loop - Source Locations", () => {
    it("should preserve source locations", () => {
        const whileLoc: Location = {
            file: "test.vf",
            line: 42,
            column: 10,
            offset: 500,
        };

        const whileExpr: Expr = {
            kind: "While",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            body: { kind: "UnitLit", loc: testLoc },
            loc: whileLoc,
        };

        const result = desugar(whileExpr);

        expect(result.loc).toBe(whileLoc);
    });
});
