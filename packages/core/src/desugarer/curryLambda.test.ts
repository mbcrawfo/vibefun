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

import { describe, expect, it } from "vitest";

import { curryLambda } from "./curryLambda.js";
import { FreshVarGen } from "./FreshVarGen.js";

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
        case "ConstructorPattern":
            return {
                kind: "CoreVariantPattern",
                constructor: pattern.constructor,
                args: pattern.args.map((a) => mockDesugarPattern(a, gen)),
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
    if (typeExpr.kind === "RecordType") {
        return {
            kind: "CoreRecordType",
            fields: typeExpr.fields.map((f) => ({
                name: f.name,
                typeExpr: mockDesugarTypeExpr(f.typeExpr),
                loc: f.loc,
            })),
            loc: typeExpr.loc,
        };
    }
    throw new Error(`Unexpected type expr kind in mock: ${typeExpr.kind}`);
};

function makeGen(): FreshVarGen {
    return new FreshVarGen();
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

    it("preserves type annotations on simple variable params via a let wrapping", () => {
        // `(x: Int) => x` must desugar to `($param0) => let x = ($param0: Int) in x`
        // so the typechecker can enforce the annotation at call sites
        // (e.g. width-subtyping rejection of missing record fields).
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

        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");
        expect((lambda.param as CoreVarPattern).name).toBe("$param0");
        expect(lambda.body.kind).toBe("CoreLet");
        const letExpr = lambda.body as { kind: "CoreLet"; pattern: CorePattern; value: CoreExpr; body: CoreExpr };
        expect(letExpr.pattern.kind).toBe("CoreVarPattern");
        expect((letExpr.pattern as CoreVarPattern).name).toBe("x");
        expect(letExpr.value.kind).toBe("CoreTypeAnnotation");
        expect(letExpr.body.kind).toBe("CoreVar");
    });

    it("drops simple-param annotations that reference an in-scope generic", () => {
        // `<T>(x: T) => x` must keep the fast path so T (an erased generic
        // marker, not a registered type) never reaches the typechecker.
        const annotated: LambdaParam = {
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            type: { kind: "TypeConst", name: "T", loc: testLoc },
            loc: testLoc,
        };
        const gen = makeGen();
        gen.pushGenerics(["T"]);
        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            gen,
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );
        gen.popGenerics();

        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");
        expect((lambda.param as CoreVarPattern).name).toBe("x");
        expect(lambda.body.kind).toBe("CoreVar");
    });

    it("preserves concrete simple-param annotations even under an outer generic lambda", () => {
        // `<T>(x: Int) => x` — the annotation `Int` does NOT reference T,
        // so it must still be enforced via the let-wrapping. Simulates a
        // nested descent where `T` is in scope from an outer lambda.
        const annotated: LambdaParam = {
            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
            type: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };
        const gen = makeGen();
        gen.pushGenerics(["T"]);
        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            gen,
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );
        gen.popGenerics();

        const lambda = result as CoreLambda;
        expect(lambda.param.kind).toBe("CoreVarPattern");
        expect((lambda.param as CoreVarPattern).name).toBe("$param0");
        expect(lambda.body.kind).toBe("CoreLet");
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

    it("drops a destructuring annotation that references an in-scope generic", () => {
        // `<T>(({ x }: { x: T })) => x` — T is erased, so the scrutinee
        // must stay a bare CoreVar (no CoreTypeAnnotation wrapping).
        const annotated: LambdaParam = {
            pattern: rec("x").pattern,
            type: {
                kind: "RecordType",
                fields: [
                    {
                        name: "x",
                        typeExpr: { kind: "TypeConst", name: "T", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = makeGen();
        gen.pushGenerics(["T"]);
        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            gen,
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );
        gen.popGenerics();

        const match = (result as CoreLambda).body as CoreMatch;
        expect(match.expr.kind).toBe("CoreVar");
    });

    it("preserves a concrete destructuring annotation even under an outer generic", () => {
        // `<T>(({ x }: { x: Int })) => x` — annotation is concrete, so
        // pattern-inference still needs the Record type threaded through.
        const annotated: LambdaParam = {
            pattern: rec("x").pattern,
            type: {
                kind: "RecordType",
                fields: [
                    {
                        name: "x",
                        typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const gen = makeGen();
        gen.pushGenerics(["T"]);
        const result = curryLambda(
            [annotated],
            body("x"),
            testLoc,
            gen,
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );
        gen.popGenerics();

        const match = (result as CoreLambda).body as CoreMatch;
        expect(match.expr.kind).toBe("CoreTypeAnnotation");
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

    it("lifts refutable constructor-pattern params into the match arm", () => {
        // (Some(x)) => x
        //
        // Regression guard: `curryLambda` must treat refutable patterns the
        // same way as irrefutable ones — strip the old VF4017 path, emit the
        // match-wrap, and leave exhaustiveness to the typechecker. The unit
        // test here cements the lowering shape even though the resulting
        // match is non-exhaustive (that's a typechecker concern, not a
        // desugarer one).
        const refutable: LambdaParam = {
            pattern: {
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = curryLambda(
            [refutable],
            body("x"),
            testLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.param.kind).toBe("CoreVarPattern");
        expect(outer.body.kind).toBe("CoreMatch");

        const match = outer.body as CoreMatch;
        expect(match.cases).toHaveLength(1);
        const arm = match.cases[0];
        expect(arm?.pattern.kind).toBe("CoreVariantPattern");
        // `match` must have exactly the single arm — we do NOT emit a synthetic
        // catch-all. Exhaustiveness reporting is the typechecker's job.
        expect(arm?.body.kind).toBe("CoreVar");
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
        expect(match.cases).toHaveLength(1);
        const arm = match.cases[0];

        expect(arm?.pattern.kind).toBe("CoreRecordPattern");
        const outerPat = arm?.pattern as CoreRecordPattern;
        expect(outerPat.fields).toHaveLength(1);
        expect(outerPat.fields[0]?.name).toBe("outer");

        const innerPat = outerPat.fields[0]?.pattern;
        expect(innerPat?.kind).toBe("CoreRecordPattern");
        const innerRecord = innerPat as CoreRecordPattern;
        expect(innerRecord.fields.map((f) => f.name)).toEqual(["inner"]);
    });

    it("preserves source locations on every synthesized wrapper node", () => {
        // Locations drive diagnostics; the match-wrap introduces new AST
        // nodes (CoreLambda, CoreMatch, CoreMatchCase, CoreVarPattern,
        // CoreVar, and — when annotated — CoreTypeAnnotation). Using a
        // distinct `paramLoc` distinguishes "outer lambda location" from
        // "destructuring-param location" so a regression that copies the
        // wrong one is caught.
        const paramLoc: Location = { file: "test.vf", line: 7, column: 3, offset: 42 };
        const lambdaLoc: Location = { file: "test.vf", line: 7, column: 1, offset: 40 };
        const annotated: LambdaParam = {
            pattern: {
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "x", loc: paramLoc },
                        loc: paramLoc,
                    },
                ],
                loc: paramLoc,
            },
            type: { kind: "TypeConst", name: "Point", loc: paramLoc },
            loc: paramLoc,
        };

        const result = curryLambda(
            [annotated],
            body("x"),
            lambdaLoc,
            makeGen(),
            mockDesugar,
            mockDesugarPattern,
            mockDesugarTypeExpr,
        );

        const outer = result as CoreLambda;
        expect(outer.loc).toBe(lambdaLoc);
        expect(outer.param.loc).toBe(paramLoc);

        const match = outer.body as CoreMatch;
        expect(match.loc).toBe(paramLoc);

        const annotation = match.expr as CoreTypeAnnotation;
        expect(annotation.loc).toBe(paramLoc);
        expect(annotation.expr.loc).toBe(paramLoc);

        const arm = match.cases[0];
        expect(arm?.loc).toBe(paramLoc);
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
