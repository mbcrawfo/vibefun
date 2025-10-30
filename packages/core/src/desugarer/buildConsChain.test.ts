/**
 * Tests for buildConsChain function
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { buildConsChain } from "./buildConsChain.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Mock desugar function for testing
const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "IntLit") {
        return { kind: "CoreIntLit", value: expr.value, loc: expr.loc };
    }
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    }
    throw new Error(`Unexpected expression kind: ${expr.kind}`);
};

// Mock FreshVarGen
const mockGen = { fresh: () => "$tmp0", reset: () => {} } as FreshVarGen;

describe("buildConsChain", () => {
    it("should build Nil for empty list", () => {
        const result = buildConsChain([], testLoc, mockGen, mockDesugar);

        expect(result.kind).toBe("CoreVariant");
        if (result.kind === "CoreVariant") {
            expect(result.constructor).toBe("Nil");
            expect(result.args).toHaveLength(0);
        }
    });

    it("should build Cons chain for single element", () => {
        const elements: { kind: "Element"; expr: Expr }[] = [
            { kind: "Element", expr: { kind: "IntLit", value: 42, loc: testLoc } },
        ];

        const result = buildConsChain(elements, testLoc, mockGen, mockDesugar);

        expect(result.kind).toBe("CoreVariant");
        if (result.kind === "CoreVariant") {
            expect(result.constructor).toBe("Cons");
            expect(result.args).toHaveLength(2);

            const head = result.args[0];
            expect(head?.kind).toBe("CoreIntLit");
            if (head?.kind === "CoreIntLit") {
                expect(head.value).toBe(42);
            }

            const tail = result.args[1];
            expect(tail?.kind).toBe("CoreVariant");
            if (tail?.kind === "CoreVariant") {
                expect(tail.constructor).toBe("Nil");
            }
        }
    });

    it("should build Cons chain for multiple elements", () => {
        const elements: { kind: "Element"; expr: Expr }[] = [
            { kind: "Element", expr: { kind: "IntLit", value: 1, loc: testLoc } },
            { kind: "Element", expr: { kind: "IntLit", value: 2, loc: testLoc } },
            { kind: "Element", expr: { kind: "IntLit", value: 3, loc: testLoc } },
        ];

        const result = buildConsChain(elements, testLoc, mockGen, mockDesugar);

        // Should be: Cons(1, Cons(2, Cons(3, Nil)))
        expect(result.kind).toBe("CoreVariant");
        if (result.kind === "CoreVariant") {
            expect(result.constructor).toBe("Cons");

            const head1 = result.args[0];
            expect(head1?.kind).toBe("CoreIntLit");
            if (head1?.kind === "CoreIntLit") {
                expect(head1.value).toBe(1);
            }

            const tail1 = result.args[1];
            expect(tail1?.kind).toBe("CoreVariant");
            if (tail1?.kind === "CoreVariant") {
                expect(tail1.constructor).toBe("Cons");

                const head2 = tail1.args[0];
                expect(head2?.kind).toBe("CoreIntLit");
                if (head2?.kind === "CoreIntLit") {
                    expect(head2.value).toBe(2);
                }

                const tail2 = tail1.args[1];
                expect(tail2?.kind).toBe("CoreVariant");
                if (tail2?.kind === "CoreVariant") {
                    expect(tail2.constructor).toBe("Cons");

                    const head3 = tail2.args[0];
                    expect(head3?.kind).toBe("CoreIntLit");
                    if (head3?.kind === "CoreIntLit") {
                        expect(head3.value).toBe(3);
                    }

                    const tail3 = tail2.args[1];
                    expect(tail3?.kind).toBe("CoreVariant");
                    if (tail3?.kind === "CoreVariant") {
                        expect(tail3.constructor).toBe("Nil");
                    }
                }
            }
        }
    });
});
