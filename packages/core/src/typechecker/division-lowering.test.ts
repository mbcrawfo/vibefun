/**
 * Integration tests for division operator lowering
 *
 * Verifies that the Divide operator is correctly lowered to IntDivide or FloatDivide
 * during type checking, across various code contexts (top-level, lambda bodies, match cases).
 */

import type { CoreBinOp, CoreLambda, CoreLetDecl, CoreMatch } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("Division Lowering Integration", () => {
    it("should lower Divide to IntDivide in top-level let binding", () => {
        // let x = 10 / 3
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Divide",
                    left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const typedModule = typeCheck(module);

        // Get the let declaration
        const decl = typedModule.module.declarations[0] as CoreLetDecl;
        expect(decl.kind).toBe("CoreLetDecl");

        // The value should be a binary op with IntDivide (lowered from Divide)
        const binOp = decl.value as CoreBinOp;
        expect(binOp.kind).toBe("CoreBinOp");
        expect(binOp.op).toBe("IntDivide");
    });

    it("should lower Divide to IntDivide inside lambda body", () => {
        // let f = (x) => x / 2
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreBinOp",
                        op: "Divide",
                        left: { kind: "CoreVar", name: "x", loc: testLoc },
                        right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const typedModule = typeCheck(module);

        // Get the let declaration
        const decl = typedModule.module.declarations[0] as CoreLetDecl;
        expect(decl.kind).toBe("CoreLetDecl");

        // The value should be a lambda
        const lambda = decl.value as CoreLambda;
        expect(lambda.kind).toBe("CoreLambda");

        // The body should be a binary op with IntDivide
        const binOp = lambda.body as CoreBinOp;
        expect(binOp.kind).toBe("CoreBinOp");
        expect(binOp.op).toBe("IntDivide");
    });

    it("should lower Divide to IntDivide inside match case body", () => {
        // let f = (x) => match x { | n => n / 2 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "f", loc: testLoc },
                value: {
                    kind: "CoreLambda",
                    param: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                    body: {
                        kind: "CoreMatch",
                        expr: { kind: "CoreVar", name: "x", loc: testLoc },
                        cases: [
                            {
                                pattern: { kind: "CoreVarPattern", name: "n", loc: testLoc },
                                body: {
                                    kind: "CoreBinOp",
                                    op: "Divide",
                                    left: { kind: "CoreVar", name: "n", loc: testLoc },
                                    right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const typedModule = typeCheck(module);

        // Navigate to the match case body
        const decl = typedModule.module.declarations[0] as CoreLetDecl;
        const lambda = decl.value as CoreLambda;
        const matchExpr = lambda.body as CoreMatch;

        // The match case body should be a binary op with IntDivide
        expect(matchExpr.cases[0]).toBeDefined();
        const caseBody = matchExpr.cases[0]!.body as CoreBinOp;
        expect(caseBody.kind).toBe("CoreBinOp");
        expect(caseBody.op).toBe("IntDivide");
    });

    it("should lower nested divisions correctly", () => {
        // let x = (10 / 2) / 3
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Divide",
                    left: {
                        kind: "CoreBinOp",
                        op: "Divide",
                        left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                        right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    right: { kind: "CoreIntLit", value: 3, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const typedModule = typeCheck(module);

        // Get the let declaration
        const decl = typedModule.module.declarations[0] as CoreLetDecl;
        const outerBinOp = decl.value as CoreBinOp;

        // Both outer and inner divisions should be IntDivide
        expect(outerBinOp.op).toBe("IntDivide");

        const innerBinOp = outerBinOp.left as CoreBinOp;
        expect(innerBinOp.kind).toBe("CoreBinOp");
        expect(innerBinOp.op).toBe("IntDivide");
    });

    it("should lower division in complex expression", () => {
        // let x = 1 + 10 / 2
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: { kind: "CoreVarPattern", name: "x", loc: testLoc },
                value: {
                    kind: "CoreBinOp",
                    op: "Add",
                    left: { kind: "CoreIntLit", value: 1, loc: testLoc },
                    right: {
                        kind: "CoreBinOp",
                        op: "Divide",
                        left: { kind: "CoreIntLit", value: 10, loc: testLoc },
                        right: { kind: "CoreIntLit", value: 2, loc: testLoc },
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const typedModule = typeCheck(module);

        // Get the let declaration
        const decl = typedModule.module.declarations[0] as CoreLetDecl;
        const addOp = decl.value as CoreBinOp;

        // Outer is still Add
        expect(addOp.op).toBe("Add");

        // Right operand should be IntDivide
        const divOp = addOp.right as CoreBinOp;
        expect(divOp.kind).toBe("CoreBinOp");
        expect(divOp.op).toBe("IntDivide");
    });
});
