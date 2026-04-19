/**
 * Tests for curryLambda function
 *
 * Note: Integration tests over the full desugarer pipeline live in
 * `lambdas.test.ts` and `desugarer-integration.test.ts`.
 */

import type { Expr, LambdaParam, Location, Pattern, RecordPatternField, TypeExpr } from "../types/ast.js";
import type {
    CoreExpr,
    CoreLambda,
    CoreMatch,
    CorePattern,
    CoreRecordPattern,
    CoreTuplePattern,
    CoreTypeAnnotation,
    CoreTypeExpr,
    CoreVarPattern,
} from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { curryLambda } from "./curryLambda.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    }
    throw new Error(`Unexpected expression kind: ${expr.kind}`);
};

// Test mock matching the shape-preserving parts of the real desugarPattern
// so destructuring-param tests exercise realistic inputs without depending
// on the full desugarer module.
const mockDesugarPattern = (pattern: Pattern, gen: FreshVarGen): CorePattern => {
    switch (pattern.kind) {
        case "VarPattern":
            return { kind: "CoreVarPattern", name: pattern.name, loc: pattern.loc };
        case "WildcardPattern":
            return { kind: "CoreWildcardPattern", loc: pattern.loc };
        case "RecordPattern":
            return {
                kind: "CoreRecordPattern",
                fields: pattern.fields.map((f: RecordPatternField) => ({
                    name: f.name,
                    pattern: mockDesugarPattern(f.pattern, gen),
                    loc: f.loc,
                })),
                loc: pattern.loc,
            };
        case "TuplePattern":
            return {
                kind: "CoreTuplePattern",
                elements: pattern.elements.map((p) => mockDesugarPattern(p, gen)),
                loc: pattern.loc,
            };
        default:
            throw new Error(`Unexpected pattern kind in mock: ${pattern.kind}`);
    }
};

const mockDesugarTypeExpr = (typeExpr: TypeExpr): CoreTypeExpr => {
    if (typeExpr.kind === "TypeConst") {
        return { kind: "CoreTypeConst", name: typeExpr.name, loc: typeExpr.loc };
    }
    throw new Error(`Unexpected type expr kind in mock: ${typeExpr.kind}`);
};

class CountingGen {
    private counter = 0;
    fresh(prefix: string = "tmp"): string {
        return `$${prefix}${this.counter++}`;
    }
    reset(): void {
        this.counter = 0;
    }
}

function makeGen(): FreshVarGen {
    return new CountingGen() as unknown as FreshVarGen;
}

const v = (name: string): LambdaParam => ({
    pattern: { kind: "VarPattern", name, loc: testLoc },
    loc: testLoc,
});
const wild = (): LambdaParam => ({
    pattern: { kind: "WildcardPattern", loc: testLoc },
    loc: testLoc,
});
const rec = (...names: string[]): LambdaParam => ({
    pattern: {
        kind: "RecordPattern",
        fields: names.map((name) => ({
            name,
            pattern: { kind: "VarPattern", name, loc: testLoc },
            loc: testLoc,
        })),
        loc: testLoc,
    },
    loc: testLoc,
});
const body = (name: string): Expr => ({ kind: "Var", name, loc: testLoc });

describe("curryLambda — simple params", () => {
    it("desugars zero parameters to a wildcard-pattern lambda", () => {
        const result = curryLambda(
            [],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreWildcardPattern");
        expect(lambda.param.loc).toBe(testLoc);
        expect(lambda.body.kind).toBe("CoreVar");
    });

    it("desugars a single variable parameter directly", () => {
        const result = curryLambda(
            [v("x")],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        expect(result.kind).toBe("CoreLambda");
        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");
        expect((lambda.param as CoreVarPattern).name).toBe("x");
        expect(lambda.body.kind).toBe("CoreVar");
    });

    it("curries a two-parameter lambda", () => {
        const result = curryLambda(
            [v("x"), v("y")],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect((outer.param as CoreVarPattern).name).toBe("x");
        expect(outer.body.kind).toBe("CoreLambda");
        const inner = outer.body as CoreLambda;
        expect((inner.param as CoreVarPattern).name).toBe("y");
    });

    it("drops type annotations on simple variable params", () => {
        const annotated: LambdaParam = {
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            type: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };
        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        // Simple-param fast path: no type annotation wrapping.
        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");
        expect(lambda.body.kind).toBe("CoreVar");
    });
});

describe("curryLambda — destructuring params", () => {
    it("wraps a record-pattern param in a match over a fresh scrutinee", () => {
        // ({ x, y }) => x
        const result = curryLambda(
            [rec("x", "y")],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.param.kind).toBe("CoreVarPattern");
        const tmpName = (outer.param as CoreVarPattern).name;
        expect(tmpName).toBe("$param0");

        expect(outer.body.kind).toBe("CoreMatch");
        const match = outer.body as CoreMatch;

        expect(match.expr.kind).toBe("CoreVar");
        expect((match.expr as { name: string }).name).toBe(tmpName);

        expect(match.cases).toHaveLength(1);
        const arm = match.cases[0];
        expect(arm?.pattern.kind).toBe("CoreRecordPattern");
        const recordPat = arm?.pattern as CoreRecordPattern;
        expect(recordPat.fields.map((f) => f.name)).toEqual(["x", "y"]);
        expect(arm?.body.kind).toBe("CoreVar");
        expect((arm?.body as { name: string }).name).toBe("x");
    });

    it("threads the param type annotation onto the match scrutinee", () => {
        // ({ x, y }: Point) => x
        const annotated: LambdaParam = {
            pattern: rec("x", "y").pattern,
            type: { kind: "TypeConst", name: "Point", loc: testLoc },
            loc: testLoc,
        };

        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.body.kind).toBe("CoreMatch");
        const match = outer.body as CoreMatch;

        // Scrutinee is a type-annotated CoreVar, not a bare CoreVar.
        expect(match.expr.kind).toBe("CoreTypeAnnotation");
        const annotation = match.expr as CoreTypeAnnotation;
        expect(annotation.expr.kind).toBe("CoreVar");
        expect((annotation.typeExpr as { name: string }).name).toBe("Point");
    });

    it("wraps a tuple-pattern param in a match", () => {
        // ((a, b)) => a
        const tupleParam: LambdaParam = {
            pattern: {
                kind: "TuplePattern",
                elements: [v("a").pattern, v("b").pattern],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = curryLambda(
            [tupleParam],
            body("a"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.body.kind).toBe("CoreMatch");
        const match = outer.body as CoreMatch;
        expect(match.cases[0]?.pattern.kind).toBe("CoreTuplePattern");
        const tuplePat = match.cases[0]?.pattern as CoreTuplePattern;
        expect(tuplePat.elements).toHaveLength(2);
    });

    it("handles destructuring in the middle of a multi-param lambda", () => {
        // (a, { x, y }, c) => x
        const result = curryLambda(
            [v("a"), rec("x", "y"), v("c")],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        // Outer: λa.
        const outerA = result as CoreLambda;
        expect((outerA.param as CoreVarPattern).name).toBe("a");

        // Middle: λ$param0. match $param0 { | { x, y } => λc. body }
        expect(outerA.body.kind).toBe("CoreLambda");
        const middle = outerA.body as CoreLambda;
        const tmpName = (middle.param as CoreVarPattern).name;
        expect(tmpName).toBe("$param0");

        expect(middle.body.kind).toBe("CoreMatch");
        const match = middle.body as CoreMatch;
        expect((match.expr as { name: string }).name).toBe(tmpName);

        const armBody = match.cases[0]?.body;
        expect(armBody?.kind).toBe("CoreLambda");
        const inner = armBody as CoreLambda;
        expect((inner.param as CoreVarPattern).name).toBe("c");
        expect(inner.body.kind).toBe("CoreVar");
        expect((inner.body as { name: string }).name).toBe("x");
    });

    it("uses distinct fresh scrutinee names for multiple destructuring params", () => {
        // ({ x }, { y }) => x
        const result = curryLambda(
            [rec("x"), rec("y")],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        const outerTmp = (outer.param as CoreVarPattern).name;

        const outerMatch = outer.body as CoreMatch;
        const inner = outerMatch.cases[0]?.body as CoreLambda;
        const innerTmp = (inner.param as CoreVarPattern).name;

        expect(outerTmp.startsWith("$param")).toBe(true);
        expect(innerTmp.startsWith("$param")).toBe(true);
        expect(innerTmp).not.toBe(outerTmp);
    });

    it("preserves nested record destructuring inside the match arm", () => {
        // ({ outer: { inner } }) => inner
        const nested: LambdaParam = {
            pattern: {
                kind: "RecordPattern",
                fields: [
                    {
                        name: "outer",
                        pattern: {
                            kind: "RecordPattern",
                            fields: [
                                {
                                    name: "inner",
                                    pattern: { kind: "VarPattern", name: "inner", loc: testLoc },
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = curryLambda(
            [nested],
            body("inner"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.body.kind).toBe("CoreMatch");
        const match = outer.body as CoreMatch;
        const arm = match.cases[0]!;

        expect(arm.pattern.kind).toBe("CoreRecordPattern");
        const outerPat = arm.pattern as CoreRecordPattern;
        expect(outerPat.fields).toHaveLength(1);
        expect(outerPat.fields[0]?.name).toBe("outer");

        const innerPat = outerPat.fields[0]?.pattern;
        expect(innerPat?.kind).toBe("CoreRecordPattern");
        const innerRecord = innerPat as CoreRecordPattern;
        expect(innerRecord.fields.map((f) => f.name)).toEqual(["inner"]);
    });

    it("preserves wildcard-pattern params without match wrapping", () => {
        const result = curryLambda(
            [wild(), v("y")],
            body("y"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.param.kind).toBe("CoreWildcardPattern");
        expect(outer.body.kind).toBe("CoreLambda");
    });
});
