/**
 * Surface-AST arbitraries for fast-check property tests.
 *
 * These generate well-formed Surface AST nodes (Tier B per the PR plan) such
 * that `prettyPrint(ast) → parse → ast'` round-trips structurally (modulo
 * locations and the parser's own normalizations). To keep round-tripping
 * tractable, the generators stay inside a conservative subset:
 *
 *   - numeric literals are non-negative (negation is generated explicitly via
 *     `UnaryOp(Negate, …)` so the resulting AST matches parser output);
 *   - string-literal contents avoid escapes that the lexer normalizes;
 *   - identifiers exclude keywords/reserved-keywords/booleans;
 *   - `Tuple` always carries ≥ 2 elements (single-element parens collapse in
 *     the parser);
 *   - `BinOp`/`UnaryOp`/`App` are always parenthesized in the printer to dodge
 *     precedence-shape rewrites.
 *
 * Depth is capped at 4 by default to keep generation < 1 ms per sample. Only
 * a Tier-B subset is generated; full coverage of every node kind is left to
 * the source-level arbitraries when a node has no clean round-trip analogue.
 */

import type {
    BinaryOp,
    Declaration,
    Expr,
    LambdaParam,
    ListElement,
    MatchCase,
    Module,
    Pattern,
    RecordField,
    RecordPatternField,
    RecordTypeField,
    TypeExpr,
    UnaryOp,
} from "../ast.js";

import * as fc from "fast-check";

import {
    lowerIdentifierArb,
    nonNegativeFloatArb,
    nonNegativeIntArb,
    safeStringContentArb,
    SYNTHETIC_LOCATION,
    upperIdentifierArb,
} from "./source-arb.js";

const LOC = SYNTHETIC_LOCATION;

const DEFAULT_DEPTH = 3;
const DEFAULT_BREADTH = 3;

export interface AstArbOptions {
    /** Maximum recursion depth (default 3). */
    readonly depth?: number;
    /** Maximum number of children per collection node (default 3). */
    readonly maxBreadth?: number;
}

const sized = <T>(arb: fc.Arbitrary<T>, max: number): fc.Arbitrary<T[]> =>
    fc.array(arb, { minLength: 0, maxLength: max });

const sizedAtLeast = <T>(arb: fc.Arbitrary<T>, min: number, max: number): fc.Arbitrary<T[]> =>
    fc.array(arb, { minLength: min, maxLength: max });

const BINARY_OPS: readonly BinaryOp[] = [
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
];

const UNARY_OPS: readonly UnaryOp[] = ["Negate", "LogicalNot"];

export const binaryOpArb: fc.Arbitrary<BinaryOp> = fc.constantFrom(...BINARY_OPS);
export const unaryOpArb: fc.Arbitrary<UnaryOp> = fc.constantFrom(...UNARY_OPS);

// ---------------------------------------------------------------------------
// Type expressions
// ---------------------------------------------------------------------------

export const typeExprArb = ({
    depth = DEFAULT_DEPTH,
    maxBreadth = DEFAULT_BREADTH,
}: AstArbOptions = {}): fc.Arbitrary<TypeExpr> => {
    const leaf: fc.Arbitrary<TypeExpr> = fc.oneof(
        lowerIdentifierArb.map((name): TypeExpr => ({ kind: "TypeVar", name, loc: LOC })),
        upperIdentifierArb.map((name): TypeExpr => ({ kind: "TypeConst", name, loc: LOC })),
        safeStringContentArb.map((value): TypeExpr => ({ kind: "StringLiteralType", value, loc: LOC })),
    );

    if (depth <= 0) {
        return leaf;
    }

    const sub = typeExprArb({ depth: depth - 1, maxBreadth });

    return fc.oneof(
        { weight: 4, arbitrary: leaf },
        {
            weight: 1,
            arbitrary: fc.tuple(upperIdentifierArb, sizedAtLeast(sub, 1, maxBreadth)).map(
                ([name, args]): TypeExpr => ({
                    kind: "TypeApp",
                    constructor: { kind: "TypeConst", name, loc: LOC },
                    args,
                    loc: LOC,
                }),
            ),
        },
        {
            weight: 1,
            // FunctionType has two source-syntax constraints worth handling here:
            //   - `()` parses as `TypeConst "Unit"`, so a zero-arg FunctionType
            //     cannot be expressed → require ≥ 1 param.
            //   - `(A, B) -> C` always flattens into a multi-param function type;
            //     a single-param FunctionType whose param is a TupleType would
            //     re-parse with the tuple flattened → never produce that shape.
            arbitrary: fc.tuple(sizedAtLeast(sub, 1, maxBreadth), sub).map(([params, return_]): TypeExpr => {
                const flattened = params.length === 1 && params[0]?.kind === "TupleType" ? params[0].elements : params;
                return {
                    kind: "FunctionType",
                    params: flattened,
                    return_,
                    loc: LOC,
                };
            }),
        },
        {
            weight: 1,
            arbitrary: sizedAtLeast(sub, 2, maxBreadth).map(
                (elements): TypeExpr => ({
                    kind: "TupleType",
                    elements,
                    loc: LOC,
                }),
            ),
        },
        {
            weight: 1,
            arbitrary: fc
                .uniqueArray(fc.tuple(lowerIdentifierArb, sub), {
                    minLength: 0,
                    maxLength: maxBreadth,
                    selector: ([n]) => n,
                })
                .map(
                    (pairs): TypeExpr => ({
                        kind: "RecordType",
                        fields: pairs.map(
                            ([name, typeExpr]): RecordTypeField => ({
                                name,
                                typeExpr,
                                loc: LOC,
                            }),
                        ),
                        loc: LOC,
                    }),
                ),
        },
    );
};

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

export const patternArb = ({
    depth = DEFAULT_DEPTH,
    maxBreadth = DEFAULT_BREADTH,
}: AstArbOptions = {}): fc.Arbitrary<Pattern> => {
    const leaf: fc.Arbitrary<Pattern> = fc.oneof(
        fc.constant({ kind: "WildcardPattern" as const, loc: LOC }),
        lowerIdentifierArb.map((name): Pattern => ({ kind: "VarPattern", name, loc: LOC })),
        nonNegativeIntArb.map((n): Pattern => ({ kind: "LiteralPattern", literal: n, loc: LOC })),
        fc.boolean().map((b): Pattern => ({ kind: "LiteralPattern", literal: b, loc: LOC })),
        safeStringContentArb.map((s): Pattern => ({ kind: "LiteralPattern", literal: s, loc: LOC })),
    );

    if (depth <= 0) {
        return leaf;
    }

    const sub = patternArb({ depth: depth - 1, maxBreadth });

    return fc.oneof(
        { weight: 5, arbitrary: leaf },
        {
            weight: 1,
            arbitrary: fc
                .tuple(upperIdentifierArb, sized(sub, maxBreadth))
                .map(([constructor, args]): Pattern => ({ kind: "ConstructorPattern", constructor, args, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: sizedAtLeast(sub, 2, maxBreadth).map(
                (elements): Pattern => ({ kind: "TuplePattern", elements, loc: LOC }),
            ),
        },
        {
            weight: 1,
            arbitrary: sized(sub, maxBreadth).map((elements): Pattern => ({ kind: "ListPattern", elements, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: fc
                .uniqueArray(fc.tuple(lowerIdentifierArb, sub), {
                    minLength: 1,
                    maxLength: maxBreadth,
                    selector: ([n]) => n,
                })
                .map(
                    (pairs): Pattern => ({
                        kind: "RecordPattern",
                        fields: pairs.map(([name, pattern]): RecordPatternField => ({ name, pattern, loc: LOC })),
                        loc: LOC,
                    }),
                ),
        },
        {
            weight: 1,
            arbitrary: sizedAtLeast(sub, 2, maxBreadth).map(
                (patterns): Pattern => ({ kind: "OrPattern", patterns, loc: LOC }),
            ),
        },
    );
};

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export const exprArb = ({
    depth = DEFAULT_DEPTH,
    maxBreadth = DEFAULT_BREADTH,
}: AstArbOptions = {}): fc.Arbitrary<Expr> => {
    const leaf: fc.Arbitrary<Expr> = fc.oneof(
        nonNegativeIntArb.map((value): Expr => ({ kind: "IntLit", value, loc: LOC })),
        nonNegativeFloatArb
            .filter((n) => !Number.isInteger(n)) // ensure FloatLit prints with a dot
            .map((value): Expr => ({ kind: "FloatLit", value, loc: LOC })),
        safeStringContentArb.map((value): Expr => ({ kind: "StringLit", value, loc: LOC })),
        fc.boolean().map((value): Expr => ({ kind: "BoolLit", value, loc: LOC })),
        fc.constant({ kind: "UnitLit" as const, loc: LOC }),
        lowerIdentifierArb.map((name): Expr => ({ kind: "Var", name, loc: LOC })),
    );

    if (depth <= 0) {
        return leaf;
    }

    const sub = exprArb({ depth: depth - 1, maxBreadth });
    const subPattern = patternArb({ depth: depth - 1, maxBreadth });
    const subType = typeExprArb({ depth: depth - 1, maxBreadth });

    return fc.oneof(
        { weight: 6, arbitrary: leaf },
        {
            weight: 2,
            arbitrary: fc
                .tuple(binaryOpArb, sub, sub)
                .map(([op, left, right]): Expr => ({ kind: "BinOp", op, left, right, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: fc.tuple(unaryOpArb, sub).map(([op, expr]): Expr => ({ kind: "UnaryOp", op, expr, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: fc
                .tuple(sub, sized(sub, maxBreadth))
                .map(([func, args]): Expr => ({ kind: "App", func, args, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: fc
                .tuple(sub, sub, sub)
                .map(([cond, then, else_]): Expr => ({ kind: "If", condition: cond, then, else_, loc: LOC })),
        },
        {
            weight: 1,
            arbitrary: fc.array(fc.tuple(subPattern, sub), { minLength: 1, maxLength: maxBreadth }).chain((cases) =>
                sub.map(
                    (scrutinee): Expr => ({
                        kind: "Match",
                        expr: scrutinee,
                        cases: cases.map(([pattern, body]): MatchCase => ({ pattern, body, loc: LOC })),
                        loc: LOC,
                    }),
                ),
            ),
        },
        {
            weight: 1,
            arbitrary: fc
                .tuple(
                    fc.array(
                        fc.tuple(
                            lowerIdentifierArb,
                            fc.option(subType, { nil: undefined }) as fc.Arbitrary<TypeExpr | undefined>,
                        ),
                        {
                            minLength: 0,
                            maxLength: maxBreadth,
                        },
                    ),
                    sub,
                )
                .map(
                    ([rawParams, body]): Expr => ({
                        kind: "Lambda",
                        params: rawParams.map(
                            ([name, type]): LambdaParam => ({
                                pattern: { kind: "VarPattern", name, loc: LOC },
                                ...(type === undefined ? {} : { type }),
                                loc: LOC,
                            }),
                        ),
                        body,
                        loc: LOC,
                    }),
                ),
        },
        {
            weight: 1,
            arbitrary: fc
                .uniqueArray(fc.tuple(lowerIdentifierArb, sub), {
                    minLength: 1,
                    maxLength: maxBreadth,
                    selector: ([n]) => n,
                })
                .map(
                    (pairs): Expr => ({
                        kind: "Record",
                        fields: pairs.map(([name, value]): RecordField => ({ kind: "Field", name, value, loc: LOC })),
                        loc: LOC,
                    }),
                ),
        },
        {
            weight: 1,
            arbitrary: sized(sub, maxBreadth).map(
                (exprs): Expr => ({
                    kind: "List",
                    elements: exprs.map((expr): ListElement => ({ kind: "Element", expr })),
                    loc: LOC,
                }),
            ),
        },
        {
            weight: 1,
            arbitrary: sizedAtLeast(sub, 2, maxBreadth).map(
                (elements): Expr => ({ kind: "Tuple", elements, loc: LOC }),
            ),
        },
    );
};

// ---------------------------------------------------------------------------
// Declarations and modules
// ---------------------------------------------------------------------------

/**
 * Generate a top-level `let` declaration. Always uses a `VarPattern` so the
 * pretty-printer can place a type annotation cleanly when present.
 */
export const letDeclArb = ({
    depth = DEFAULT_DEPTH,
    maxBreadth = DEFAULT_BREADTH,
}: AstArbOptions = {}): fc.Arbitrary<Declaration> =>
    fc.tuple(lowerIdentifierArb, exprArb({ depth, maxBreadth })).map(
        ([name, value]): Declaration => ({
            kind: "LetDecl",
            pattern: { kind: "VarPattern", name, loc: LOC },
            value,
            mutable: false,
            recursive: false,
            exported: false,
            loc: LOC,
        }),
    );

export const declArb = (options: AstArbOptions = {}): fc.Arbitrary<Declaration> => letDeclArb(options);

export const moduleArb = ({
    depth = DEFAULT_DEPTH,
    maxBreadth = DEFAULT_BREADTH,
}: AstArbOptions = {}): fc.Arbitrary<Module> =>
    sizedAtLeast(letDeclArb({ depth, maxBreadth }), 1, maxBreadth).map(
        (declarations): Module => ({ imports: [], declarations, loc: LOC }),
    );
