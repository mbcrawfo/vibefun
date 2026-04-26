/**
 * fast-check arbitraries for Vibefun's Core AST.
 *
 * The plan distinguishes two tiers:
 * - **Tier A** — recursively well-shaped CoreExpr values with no scope or
 *   binding correctness. Free-variable references may name nothing in
 *   particular. Use for "function does not throw" oracles and structural
 *   properties (determinism, equality, transformation totality).
 * - **Tier B** — additionally honors invariants required by downstream
 *   consumers: `let rec` lives only in `CoreLetRecGroup` / `CoreLetRecExpr`
 *   (never in `CoreLet`); every node carries a `Location`.
 *
 * Tier C (typecheck-clean) and Tier D (fully-typed Core) are out of scope for
 * PR 4 and live in later PRs if needed.
 */

import type {
    CoreApp,
    CoreBinaryOp,
    CoreBinOp,
    CoreBoolLit,
    CoreDeclaration,
    CoreExpr,
    CoreFloatLit,
    CoreFunctionType,
    CoreImportDecl,
    CoreImportItem,
    CoreIntLit,
    CoreLambda,
    CoreLet,
    CoreLetDecl,
    CoreLetRecExpr,
    CoreLetRecGroup,
    CoreLiteral,
    CoreLiteralPattern,
    CoreMatch,
    CoreMatchCase,
    CoreModule,
    CorePattern,
    CoreRecord,
    CoreRecordAccess,
    CoreRecordField,
    CoreRecordPattern,
    CoreRecordPatternField,
    CoreRecordType,
    CoreRecordTypeField,
    CoreRecordUpdate,
    CoreStringLit,
    CoreTryCatch,
    CoreTuple,
    CoreTuplePattern,
    CoreTupleType,
    CoreTypeAnnotation,
    CoreTypeApp,
    CoreTypeConst,
    CoreTypeDecl,
    CoreTypeExpr,
    CoreTypeVar,
    CoreUnary,
    CoreUnaryOp,
    CoreUnionType,
    CoreUnitLit,
    CoreUnsafe,
    CoreVar,
    CoreVariant,
    CoreVariantConstructor,
    CoreVariantPattern,
    CoreVariantType,
    CoreWildcardPattern,
} from "../core-ast.js";

import * as fc from "fast-check";

import { lowerIdentifierArb, SYNTHETIC_LOCATION, upperIdentifierArb } from "./source-arb.js";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/**
 * Constant location every Tier-A/B node carries. Reuses the parser PR's
 * `SYNTHETIC_LOCATION` so all test-arbitrary modules agree on a single
 * synthetic location (better shrinking and predictable equality).
 */
const LOC = SYNTHETIC_LOCATION;

const BINARY_OPS: readonly CoreBinaryOp[] = [
    "Add",
    "Subtract",
    "Multiply",
    "Divide",
    "IntDivide",
    "FloatDivide",
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
    "RefAssign",
];

const UNARY_OPS: readonly CoreUnary[] = ["Negate", "LogicalNot", "Deref"];

export const coreBinaryOpArb: fc.Arbitrary<CoreBinaryOp> = fc.constantFrom(...BINARY_OPS);
export const coreUnaryOpArb: fc.Arbitrary<CoreUnary> = fc.constantFrom(...UNARY_OPS);

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

const intLitArb: fc.Arbitrary<CoreIntLit> = fc
    .integer({ min: -1000, max: 1000 })
    .map((value) => ({ kind: "CoreIntLit" as const, value, loc: LOC }));

const floatLitArb: fc.Arbitrary<CoreFloatLit> = fc
    .float({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 })
    .map((value) => ({ kind: "CoreFloatLit" as const, value, loc: LOC }));

const stringLitArb: fc.Arbitrary<CoreStringLit> = fc
    .string({ maxLength: 16 })
    .map((value) => ({ kind: "CoreStringLit" as const, value, loc: LOC }));

const boolLitArb: fc.Arbitrary<CoreBoolLit> = fc
    .boolean()
    .map((value) => ({ kind: "CoreBoolLit" as const, value, loc: LOC }));

const unitLitArb: fc.Arbitrary<CoreUnitLit> = fc.constant({ kind: "CoreUnitLit" as const, loc: LOC });

const varArb: fc.Arbitrary<CoreVar> = lowerIdentifierArb.map((name) => ({
    kind: "CoreVar" as const,
    name,
    loc: LOC,
}));

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

export interface CorePatternArbOptions {
    /** Nesting depth budget. Higher = deeper variant/record/tuple patterns. */
    readonly depth?: number;
}

const literalArb: fc.Arbitrary<CoreLiteral> = fc.oneof(
    fc.integer({ min: -100, max: 100 }),
    fc.string({ maxLength: 8 }),
    fc.boolean(),
    fc.constant(null),
);

const wildcardPatternArb: fc.Arbitrary<CoreWildcardPattern> = fc.constant({
    kind: "CoreWildcardPattern" as const,
    loc: LOC,
});

const varPatternArb: fc.Arbitrary<CorePattern> = lowerIdentifierArb.map((name) => ({
    kind: "CoreVarPattern" as const,
    name,
    loc: LOC,
}));

const literalPatternArb: fc.Arbitrary<CoreLiteralPattern> = literalArb.map((literal) => ({
    kind: "CoreLiteralPattern" as const,
    literal,
    loc: LOC,
}));

/**
 * Recursive pattern arbitrary. `depth` bounds nesting: each step decrements
 * until 0, where only leaf patterns (wildcard, var, literal) are produced.
 */
export const corePatternArb = (options: CorePatternArbOptions = {}): fc.Arbitrary<CorePattern> => {
    const depth = options.depth ?? 2;
    const leaf: fc.Arbitrary<CorePattern> = fc.oneof(wildcardPatternArb, varPatternArb, literalPatternArb);

    if (depth <= 0) {
        return leaf;
    }

    const child = corePatternArb({ depth: depth - 1 });
    const variantPat: fc.Arbitrary<CoreVariantPattern> = fc
        .record({
            constructor: upperIdentifierArb,
            args: fc.array(child, { maxLength: 3 }),
        })
        .map(({ constructor, args }) => ({
            kind: "CoreVariantPattern" as const,
            constructor,
            args,
            loc: LOC,
        }));

    const recordField: fc.Arbitrary<CoreRecordPatternField> = fc
        .record({ name: lowerIdentifierArb, pattern: child })
        .map(({ name, pattern }) => ({ name, pattern, loc: LOC }));

    const recordPat: fc.Arbitrary<CoreRecordPattern> = fc
        .uniqueArray(recordField, { maxLength: 3, selector: (f) => f.name })
        .map((fields) => ({ kind: "CoreRecordPattern" as const, fields, loc: LOC }));

    const tuplePat: fc.Arbitrary<CoreTuplePattern> = fc
        .array(child, { minLength: 2, maxLength: 4 })
        .map((elements) => ({ kind: "CoreTuplePattern" as const, elements, loc: LOC }));

    return fc.oneof(leaf, variantPat, recordPat, tuplePat);
};

// ---------------------------------------------------------------------------
// Type expressions
// ---------------------------------------------------------------------------

export interface CoreTypeExprArbOptions {
    readonly depth?: number;
}

const typeVarArb: fc.Arbitrary<CoreTypeVar> = lowerIdentifierArb.map((name) => ({
    kind: "CoreTypeVar" as const,
    name,
    loc: LOC,
}));

const typeConstArb: fc.Arbitrary<CoreTypeConst> = fc
    .constantFrom("Int", "Float", "String", "Bool", "Unit")
    .map((name) => ({ kind: "CoreTypeConst" as const, name, loc: LOC }));

export const coreTypeExprArb = (options: CoreTypeExprArbOptions = {}): fc.Arbitrary<CoreTypeExpr> => {
    const depth = options.depth ?? 2;
    const leaf: fc.Arbitrary<CoreTypeExpr> = fc.oneof(typeVarArb, typeConstArb);

    if (depth <= 0) {
        return leaf;
    }

    const child = coreTypeExprArb({ depth: depth - 1 });

    const typeAppArb: fc.Arbitrary<CoreTypeApp> = fc
        .record({ constructor: child, args: fc.array(child, { minLength: 1, maxLength: 3 }) })
        .map(({ constructor, args }) => ({
            kind: "CoreTypeApp" as const,
            constructor,
            args,
            loc: LOC,
        }));

    const fnTypeArb: fc.Arbitrary<CoreFunctionType> = fc
        .record({ params: fc.array(child, { maxLength: 3 }), return_: child })
        .map(({ params, return_ }) => ({
            kind: "CoreFunctionType" as const,
            params,
            return_,
            loc: LOC,
        }));

    const recordTypeFieldArb: fc.Arbitrary<CoreRecordTypeField> = fc
        .record({ name: lowerIdentifierArb, typeExpr: child })
        .map(({ name, typeExpr }) => ({ name, typeExpr, loc: LOC }));

    const recordTypeArb: fc.Arbitrary<CoreRecordType> = fc
        .uniqueArray(recordTypeFieldArb, { maxLength: 3, selector: (f) => f.name })
        .map((fields) => ({ kind: "CoreRecordType" as const, fields, loc: LOC }));

    const variantConstructorArb: fc.Arbitrary<CoreVariantConstructor> = fc
        .record({ name: upperIdentifierArb, args: fc.array(child, { maxLength: 2 }) })
        .map(({ name, args }) => ({ name, args, loc: LOC }));

    const variantTypeArb: fc.Arbitrary<CoreVariantType> = fc
        .uniqueArray(variantConstructorArb, { minLength: 1, maxLength: 3, selector: (c) => c.name })
        .map((constructors) => ({
            kind: "CoreVariantType" as const,
            constructors,
            loc: LOC,
        }));

    const unionTypeArb: fc.Arbitrary<CoreUnionType> = fc
        .array(child, { minLength: 2, maxLength: 4 })
        .map((types) => ({ kind: "CoreUnionType" as const, types, loc: LOC }));

    const tupleTypeArb: fc.Arbitrary<CoreTupleType> = fc
        .array(child, { minLength: 2, maxLength: 4 })
        .map((elements) => ({ kind: "CoreTupleType" as const, elements, loc: LOC }));

    return fc.oneof(leaf, typeAppArb, fnTypeArb, recordTypeArb, variantTypeArb, unionTypeArb, tupleTypeArb);
};

// ---------------------------------------------------------------------------
// Core expressions
// ---------------------------------------------------------------------------

export type CoreExprTier = "A" | "B";

export interface CoreExprArbOptions {
    /** Recursion depth budget. */
    readonly depth?: number;
    /** Tier A vs Tier B. See file header for the distinction. */
    readonly tier?: CoreExprTier;
}

const leafExprArb: fc.Arbitrary<CoreExpr> = fc.oneof(
    intLitArb,
    floatLitArb,
    stringLitArb,
    boolLitArb,
    unitLitArb,
    varArb,
);

/**
 * Build a Core AST expression arbitrary.
 *
 * Tier A and Tier B differ in one structural rule: Tier A may emit `CoreLet`
 * with a `mutable: true` field but never produces `let rec`-shaped `CoreLet`
 * (the type forbids it anyway); Tier B additionally guarantees that
 * `CoreLetRecExpr` always has at least one binding and its bindings are
 * generated with the same depth budget the parent expression uses, so
 * downstream invariants (no `let rec` in `CoreLet`) hold by construction.
 *
 * Both tiers may produce `CoreVar` nodes whose names do not appear in any
 * enclosing binder — that's intentional: the desugarer and util passes do not
 * scope-check, and "does not throw on free names" is a property worth firing.
 */
export const coreExprArb = (options: CoreExprArbOptions = {}): fc.Arbitrary<CoreExpr> => {
    const depth = options.depth ?? 3;
    const tier = options.tier ?? "A";

    if (depth <= 0) {
        return leafExprArb;
    }

    const child = coreExprArb({ depth: depth - 1, tier });
    const pattern = corePatternArb({ depth: Math.min(depth - 1, 2) });
    const typeExpr = coreTypeExprArb({ depth: Math.min(depth - 1, 2) });

    const letArb: fc.Arbitrary<CoreLet> = fc
        .record({ pattern, value: child, body: child, mutable: fc.boolean() })
        .map(({ pattern: p, value, body, mutable }) => ({
            kind: "CoreLet" as const,
            pattern: p,
            value,
            body,
            mutable,
            loc: LOC,
        }));

    const letRecBindingArb = fc
        .record({ pattern, value: child, mutable: fc.boolean() })
        .map(({ pattern: p, value, mutable }) => ({
            pattern: p,
            value,
            mutable,
            loc: LOC,
        }));

    const letRecArb: fc.Arbitrary<CoreLetRecExpr> = fc
        .record({
            bindings: fc.array(letRecBindingArb, { minLength: 1, maxLength: 3 }),
            body: child,
        })
        .map(({ bindings, body }) => ({
            kind: "CoreLetRecExpr" as const,
            bindings,
            body,
            loc: LOC,
        }));

    const lambdaArb: fc.Arbitrary<CoreLambda> = fc.record({ param: pattern, body: child }).map(({ param, body }) => ({
        kind: "CoreLambda" as const,
        param,
        body,
        loc: LOC,
    }));

    const appArb: fc.Arbitrary<CoreApp> = fc
        .record({ func: child, args: fc.array(child, { minLength: 1, maxLength: 3 }) })
        .map(({ func, args }) => ({ kind: "CoreApp" as const, func, args, loc: LOC }));

    const matchCaseArb: fc.Arbitrary<CoreMatchCase> = fc
        .record({
            pattern,
            guard: fc.option(child, { nil: undefined }),
            body: child,
        })
        .map(({ pattern: p, guard, body }) => ({
            pattern: p,
            ...(guard !== undefined ? { guard } : {}),
            body,
            loc: LOC,
        }));

    const matchArb: fc.Arbitrary<CoreMatch> = fc
        .record({
            expr: child,
            cases: fc.array(matchCaseArb, { minLength: 1, maxLength: 3 }),
        })
        .map(({ expr, cases }) => ({ kind: "CoreMatch" as const, expr, cases, loc: LOC }));

    const recordFieldArb: fc.Arbitrary<CoreRecordField> = fc.oneof(
        fc.record({ name: lowerIdentifierArb, value: child }).map(
            ({ name, value }): CoreRecordField => ({
                kind: "Field",
                name,
                value,
                loc: LOC,
            }),
        ),
        child.map((expr): CoreRecordField => ({ kind: "Spread", expr, loc: LOC })),
    );

    const recordArb: fc.Arbitrary<CoreRecord> = fc
        .array(recordFieldArb, { maxLength: 3 })
        .map((fields) => ({ kind: "CoreRecord" as const, fields, loc: LOC }));

    const recordAccessArb: fc.Arbitrary<CoreRecordAccess> = fc
        .record({ record: child, field: lowerIdentifierArb })
        .map(({ record, field }) => ({
            kind: "CoreRecordAccess" as const,
            record,
            field,
            loc: LOC,
        }));

    const recordUpdateArb: fc.Arbitrary<CoreRecordUpdate> = fc
        .record({ record: child, updates: fc.array(recordFieldArb, { minLength: 1, maxLength: 3 }) })
        .map(({ record, updates }) => ({
            kind: "CoreRecordUpdate" as const,
            record,
            updates,
            loc: LOC,
        }));

    const variantArb: fc.Arbitrary<CoreVariant> = fc
        .record({ constructor: upperIdentifierArb, args: fc.array(child, { maxLength: 3 }) })
        .map(({ constructor, args }) => ({
            kind: "CoreVariant" as const,
            constructor,
            args,
            loc: LOC,
        }));

    const binOpArb: fc.Arbitrary<CoreBinOp> = fc
        .record({ op: coreBinaryOpArb, left: child, right: child })
        .map(({ op, left, right }) => ({
            kind: "CoreBinOp" as const,
            op,
            left,
            right,
            loc: LOC,
        }));

    const unaryOpArb: fc.Arbitrary<CoreUnaryOp> = fc
        .record({ op: coreUnaryOpArb, expr: child })
        .map(({ op, expr }) => ({
            kind: "CoreUnaryOp" as const,
            op,
            expr,
            loc: LOC,
        }));

    const typeAnnotArb: fc.Arbitrary<CoreTypeAnnotation> = fc
        .record({ expr: child, typeExpr })
        .map(({ expr, typeExpr: te }) => ({
            kind: "CoreTypeAnnotation" as const,
            expr,
            typeExpr: te,
            loc: LOC,
        }));

    const unsafeArb: fc.Arbitrary<CoreUnsafe> = child.map((expr) => ({
        kind: "CoreUnsafe" as const,
        expr,
        loc: LOC,
    }));

    const tryCatchArb: fc.Arbitrary<CoreTryCatch> = fc
        .record({ tryBody: child, catchBinder: lowerIdentifierArb, catchBody: child })
        .map(({ tryBody, catchBinder, catchBody }) => ({
            kind: "CoreTryCatch" as const,
            tryBody,
            catchBinder,
            catchBody,
            loc: LOC,
        }));

    const tupleArb: fc.Arbitrary<CoreTuple> = fc
        .array(child, { minLength: 2, maxLength: 4 })
        .map((elements) => ({ kind: "CoreTuple" as const, elements, loc: LOC }));

    return fc.oneof(
        leafExprArb,
        letArb,
        letRecArb,
        lambdaArb,
        appArb,
        matchArb,
        recordArb,
        recordAccessArb,
        recordUpdateArb,
        variantArb,
        binOpArb,
        unaryOpArb,
        typeAnnotArb,
        unsafeArb,
        tryCatchArb,
        tupleArb,
    );
};

// ---------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------

export interface CoreDeclArbOptions {
    readonly depth?: number;
    readonly tier?: CoreExprTier;
}

export const coreDeclArb = (options: CoreDeclArbOptions = {}): fc.Arbitrary<CoreDeclaration> => {
    const depth = options.depth ?? 3;
    const tier = options.tier ?? "A";
    const expr = coreExprArb({ depth, tier });
    const pattern = corePatternArb({ depth: 2 });
    const typeExpr = coreTypeExprArb({ depth: 2 });

    const letDeclArb: fc.Arbitrary<CoreLetDecl> = fc
        .record({ pattern, value: expr, mutable: fc.boolean(), exported: fc.boolean() })
        .map(({ pattern: p, value, mutable, exported }) => ({
            kind: "CoreLetDecl" as const,
            pattern: p,
            value,
            mutable,
            exported,
            loc: LOC,
        }));

    const letRecBindingArb = fc
        .record({ pattern, value: expr, mutable: fc.boolean() })
        .map(({ pattern: p, value, mutable }) => ({
            pattern: p,
            value,
            mutable,
            loc: LOC,
        }));

    const letRecGroupArb: fc.Arbitrary<CoreLetRecGroup> = fc
        .record({
            bindings: fc.array(letRecBindingArb, { minLength: 1, maxLength: 3 }),
            exported: fc.boolean(),
        })
        .map(({ bindings, exported }) => ({
            kind: "CoreLetRecGroup" as const,
            bindings,
            exported,
            loc: LOC,
        }));

    const typeDeclArb: fc.Arbitrary<CoreTypeDecl> = fc
        .record({
            name: lowerIdentifierArb,
            params: fc.array(lowerIdentifierArb, { maxLength: 3 }),
            aliasType: typeExpr,
            exported: fc.boolean(),
        })
        .map(({ name, params, aliasType, exported }) => ({
            kind: "CoreTypeDecl" as const,
            name,
            params,
            definition: { kind: "CoreAliasType" as const, typeExpr: aliasType, loc: LOC },
            exported,
            loc: LOC,
        }));

    return fc.oneof(letDeclArb, letRecGroupArb, typeDeclArb);
};

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export interface CoreModuleArbOptions {
    readonly depth?: number;
    readonly tier?: CoreExprTier;
}

const importItemArb: fc.Arbitrary<CoreImportItem> = fc
    .record({
        name: lowerIdentifierArb,
        alias: fc.option(lowerIdentifierArb, { nil: undefined }),
        isType: fc.boolean(),
    })
    .map(({ name, alias, isType }) => ({
        name,
        ...(alias !== undefined ? { alias } : {}),
        isType,
    }));

const importDeclArb: fc.Arbitrary<CoreImportDecl> = fc
    .record({
        items: fc.array(importItemArb, { minLength: 1, maxLength: 3 }),
        from: fc.stringMatching(/^\.\/[a-z]{1,8}$/),
    })
    .map(({ items, from }) => ({
        kind: "CoreImportDecl" as const,
        items,
        from,
        loc: LOC,
    }));

export const coreModuleArb = (options: CoreModuleArbOptions = {}): fc.Arbitrary<CoreModule> =>
    fc
        .record({
            imports: fc.array(importDeclArb, { maxLength: 2 }),
            declarations: fc.array(coreDeclArb(options), { maxLength: 4 }),
        })
        .map(({ imports, declarations }) => ({ imports, declarations, loc: LOC }));

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

export interface SubstitutionArbOptions {
    readonly maxSize?: number;
    readonly depth?: number;
    readonly tier?: CoreExprTier;
}

/**
 * A substitution as the utils module models it: a `Map<string, CoreExpr>`
 * from variable name → replacement expression. Keys are unique by
 * construction.
 */
export const substitutionArb = (options: SubstitutionArbOptions = {}): fc.Arbitrary<Map<string, CoreExpr>> => {
    const maxSize = options.maxSize ?? 4;
    const expr = coreExprArb({ depth: options.depth ?? 2, tier: options.tier ?? "A" });
    return fc
        .uniqueArray(fc.tuple(lowerIdentifierArb, expr), { maxLength: maxSize, selector: (t) => t[0] })
        .map((entries) => new Map(entries));
};

// ---------------------------------------------------------------------------
// Module dependency graphs
// ---------------------------------------------------------------------------

export interface ModuleGraphSpec {
    /** Node identifiers, deterministic order. */
    readonly nodes: string[];
    /** Directed edges (from, to, isTypeOnly). May contain self-loops or cycles. */
    readonly edges: Array<{ from: string; to: string; isTypeOnly: boolean }>;
}

export interface ModuleGraphArbOptions {
    /** Maximum node count (graph may have fewer). */
    readonly maxSize?: number;
    /** Edge density in [0, 1]; probability of an edge between any ordered pair. */
    readonly density?: number;
    /** When true, only DAGs are produced (only forward edges in the node order). */
    readonly acyclic?: boolean;
}

/**
 * A graph generator that emits node names like `mod0`, `mod1`, … and a list
 * of directed edges. The `acyclic` flag restricts edges to forward order
 * (only `i → j` when `i < j`), guaranteeing a DAG. With `acyclic: false`
 * (the default) self-loops and cycles are possible.
 *
 * Density biases the include-edge probability via a weighted Bernoulli draw
 * — fast-check `frequency` weights are integers, so we map `density` to
 * weights `(round(density*100), round((1-density)*100))`.
 *
 * Edges are produced in deterministic order (by `(from, to)`) so cycle
 * output is comparable across runs and shrinking has a stable target.
 */
export const moduleGraphArb = (options: ModuleGraphArbOptions = {}): fc.Arbitrary<ModuleGraphSpec> => {
    const maxSize = options.maxSize ?? 8;
    const density = Math.min(1, Math.max(0, options.density ?? 0.3));
    const acyclic = options.acyclic ?? false;

    const includeWeight = Math.max(1, Math.round(density * 100));
    const excludeWeight = Math.max(1, Math.round((1 - density) * 100));
    const includeArb: fc.Arbitrary<boolean> = fc.oneof(
        { weight: includeWeight, arbitrary: fc.constant(true) },
        { weight: excludeWeight, arbitrary: fc.constant(false) },
    );

    return fc.integer({ min: 1, max: maxSize }).chain((n) => {
        const nodes = Array.from({ length: n }, (_, i) => `mod${i}`);
        const possibleEdges: Array<{ from: string; to: string }> = [];
        for (let i = 0; i < n; i++) {
            const from = nodes[i] as string;
            for (let j = 0; j < n; j++) {
                if (acyclic && j <= i) continue;
                possibleEdges.push({ from, to: nodes[j] as string });
            }
        }

        if (possibleEdges.length === 0) {
            return fc.constant({ nodes, edges: [] });
        }

        return fc
            .array(fc.tuple(includeArb, fc.boolean()), {
                minLength: possibleEdges.length,
                maxLength: possibleEdges.length,
            })
            .map((flags) => {
                const edges: Array<{ from: string; to: string; isTypeOnly: boolean }> = [];
                for (let k = 0; k < possibleEdges.length; k++) {
                    const flagPair = flags[k];
                    const edge = possibleEdges[k];
                    if (!flagPair || !edge) continue;
                    const [include, isTypeOnly] = flagPair;
                    if (!include) continue;
                    edges.push({ from: edge.from, to: edge.to, isTypeOnly });
                }
                return { nodes, edges };
            });
    });
};
