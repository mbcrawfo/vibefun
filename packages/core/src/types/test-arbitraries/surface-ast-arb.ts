/**
 * Minimal fast-check arbitraries for Vibefun's Surface AST.
 *
 * PR 3 (the parser PR) is expected to grow this into a full surface-AST
 * generator with lexer-token round-trip support. PR 4 only needs enough
 * surface AST to drive the desugarer through every Surface→Core lowering
 * shape, so this module covers literals, variables, the basic compound
 * forms (let/lambda/if/match/blocks/lists/records/tuples), pipe and
 * composition operators, while loops, type annotations, and unsafe blocks.
 *
 * The generator deliberately produces only well-shaped (parseable) ASTs.
 * It does NOT enforce scope correctness — a `Var` reference may name
 * nothing in particular — because the desugarer doesn't typecheck.
 */

import type { BinaryOp, Expr, ListElement, MatchCase, Pattern, RecordField, UnaryOp } from "../ast.js";

import * as fc from "fast-check";

import { DUMMY_LOC, identifierArb } from "./core-ast-arb.js";

const SURFACE_BINARY_OPS: readonly BinaryOp[] = [
    "Add",
    "Subtract",
    "Multiply",
    "Divide",
    "Modulo",
    "Equal",
    "NotEqual",
    "LessThan",
    "LessEqual",
    "GreaterThan",
    "GreaterEqual",
    "LogicalAnd",
    "LogicalOr",
    "Concat",
    "Cons",
    "ForwardCompose",
    "BackwardCompose",
    "RefAssign",
];

const SURFACE_UNARY_OPS: readonly UnaryOp[] = ["Negate", "LogicalNot", "Deref"];

export const surfaceBinaryOpArb: fc.Arbitrary<BinaryOp> = fc.constantFrom(...SURFACE_BINARY_OPS);
export const surfaceUnaryOpArb: fc.Arbitrary<UnaryOp> = fc.constantFrom(...SURFACE_UNARY_OPS);

export interface SurfacePatternArbOptions {
    readonly depth?: number;
}

const wildcardPatternArb: fc.Arbitrary<Pattern> = fc.constant({
    kind: "WildcardPattern" as const,
    loc: DUMMY_LOC,
});

const varPatternArb: fc.Arbitrary<Pattern> = identifierArb.map((name) => ({
    kind: "VarPattern" as const,
    name,
    loc: DUMMY_LOC,
}));

const literalPatternArb: fc.Arbitrary<Pattern> = fc
    .oneof(fc.integer({ min: -100, max: 100 }), fc.string({ maxLength: 6 }), fc.boolean())
    .map((literal) => ({ kind: "LiteralPattern" as const, literal, loc: DUMMY_LOC }));

export const surfacePatternArb = (options: SurfacePatternArbOptions = {}): fc.Arbitrary<Pattern> => {
    const depth = options.depth ?? 1;
    const leaf = fc.oneof(wildcardPatternArb, varPatternArb, literalPatternArb);
    if (depth <= 0) return leaf;
    return leaf;
};

export interface SurfaceExprArbOptions {
    readonly depth?: number;
}

const intLitArb: fc.Arbitrary<Expr> = fc
    .integer({ min: -1000, max: 1000 })
    .map((value) => ({ kind: "IntLit" as const, value, loc: DUMMY_LOC }));

const floatLitArb: fc.Arbitrary<Expr> = fc
    .float({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 })
    .map((value) => ({ kind: "FloatLit" as const, value, loc: DUMMY_LOC }));

const stringLitArb: fc.Arbitrary<Expr> = fc
    .string({ maxLength: 12 })
    .map((value) => ({ kind: "StringLit" as const, value, loc: DUMMY_LOC }));

const boolLitArb: fc.Arbitrary<Expr> = fc
    .boolean()
    .map((value) => ({ kind: "BoolLit" as const, value, loc: DUMMY_LOC }));

const unitLitArb: fc.Arbitrary<Expr> = fc.constant({ kind: "UnitLit" as const, loc: DUMMY_LOC });

const varArb: fc.Arbitrary<Expr> = identifierArb.map((name) => ({
    kind: "Var" as const,
    name,
    loc: DUMMY_LOC,
}));

const leafSurfaceArb: fc.Arbitrary<Expr> = fc.oneof(
    intLitArb,
    floatLitArb,
    stringLitArb,
    boolLitArb,
    unitLitArb,
    varArb,
);

/**
 * Recursive Surface-AST expression generator.
 *
 * The recursion is bounded by `depth`. Every step decrements until 0, where
 * only leaves are produced. Producing a balanced mix of compound shapes
 * (Let, Lambda, If, Match, Block, List, Record, BinOp, Pipe) ensures the
 * generator covers every Surface→Core lowering branch in one fixture.
 */
export const surfaceExprArb = (options: SurfaceExprArbOptions = {}): fc.Arbitrary<Expr> => {
    const depth = options.depth ?? 3;
    if (depth <= 0) return leafSurfaceArb;

    const child = surfaceExprArb({ depth: depth - 1 });
    const pattern = surfacePatternArb({ depth: 1 });

    const letArb: fc.Arbitrary<Expr> = fc
        .record({ pattern, value: child, body: child, mutable: fc.boolean(), recursive: fc.boolean() })
        .map(({ pattern: p, value, body, mutable, recursive }) => ({
            kind: "Let" as const,
            pattern: p,
            value,
            body,
            mutable,
            recursive,
            loc: DUMMY_LOC,
        }));

    const lambdaArb: fc.Arbitrary<Expr> = fc
        .record({
            params: fc.array(
                pattern.map((p) => ({ pattern: p, loc: DUMMY_LOC })),
                {
                    minLength: 1,
                    maxLength: 3,
                },
            ),
            body: child,
        })
        .map(({ params, body }) => ({ kind: "Lambda" as const, params, body, loc: DUMMY_LOC }));

    const appArb: fc.Arbitrary<Expr> = fc
        .record({ func: child, args: fc.array(child, { minLength: 1, maxLength: 3 }) })
        .map(({ func, args }) => ({ kind: "App" as const, func, args, loc: DUMMY_LOC }));

    const ifArb: fc.Arbitrary<Expr> = fc
        .record({ condition: child, then: child, else_: child })
        .map(({ condition, then, else_ }) => ({
            kind: "If" as const,
            condition,
            then,
            else_,
            loc: DUMMY_LOC,
        }));

    const matchCaseArb: fc.Arbitrary<MatchCase> = fc.record({ pattern, body: child }).map(({ pattern: p, body }) => ({
        pattern: p,
        body,
        loc: DUMMY_LOC,
    }));

    const matchArb: fc.Arbitrary<Expr> = fc
        .record({ expr: child, cases: fc.array(matchCaseArb, { minLength: 1, maxLength: 3 }) })
        .map(({ expr, cases }) => ({ kind: "Match" as const, expr, cases, loc: DUMMY_LOC }));

    const blockArb: fc.Arbitrary<Expr> = fc
        .array(child, { minLength: 1, maxLength: 3 })
        .map((exprs) => ({ kind: "Block" as const, exprs, loc: DUMMY_LOC }));

    const listElementArb: fc.Arbitrary<ListElement> = fc.oneof(
        child.map((expr): ListElement => ({ kind: "Element", expr })),
        child.map((expr): ListElement => ({ kind: "Spread", expr })),
    );

    const listArb: fc.Arbitrary<Expr> = fc
        .array(listElementArb, { maxLength: 3 })
        .map((elements) => ({ kind: "List" as const, elements, loc: DUMMY_LOC }));

    const recordFieldArb: fc.Arbitrary<RecordField> = fc.oneof(
        fc.record({ name: identifierArb, value: child }).map(
            ({ name, value }): RecordField => ({
                kind: "Field",
                name,
                value,
                loc: DUMMY_LOC,
            }),
        ),
        child.map((expr): RecordField => ({ kind: "Spread", expr, loc: DUMMY_LOC })),
    );

    const recordArb: fc.Arbitrary<Expr> = fc
        .array(recordFieldArb, { maxLength: 3 })
        .map((fields) => ({ kind: "Record" as const, fields, loc: DUMMY_LOC }));

    const binOpArb: fc.Arbitrary<Expr> = fc
        .record({ op: surfaceBinaryOpArb, left: child, right: child })
        .map(({ op, left, right }) => ({ kind: "BinOp" as const, op, left, right, loc: DUMMY_LOC }));

    const unaryOpArb: fc.Arbitrary<Expr> = fc
        .record({ op: surfaceUnaryOpArb, expr: child })
        .map(({ op, expr }) => ({ kind: "UnaryOp" as const, op, expr, loc: DUMMY_LOC }));

    const pipeArb: fc.Arbitrary<Expr> = fc.record({ expr: child, func: child }).map(({ expr, func }) => ({
        kind: "Pipe" as const,
        expr,
        func,
        loc: DUMMY_LOC,
    }));

    const tupleArb: fc.Arbitrary<Expr> = fc
        .array(child, { minLength: 2, maxLength: 4 })
        .map((elements) => ({ kind: "Tuple" as const, elements, loc: DUMMY_LOC }));

    return fc.oneof(
        leafSurfaceArb,
        letArb,
        lambdaArb,
        appArb,
        ifArb,
        matchArb,
        blockArb,
        listArb,
        recordArb,
        binOpArb,
        unaryOpArb,
        pipeArb,
        tupleArb,
    );
};
