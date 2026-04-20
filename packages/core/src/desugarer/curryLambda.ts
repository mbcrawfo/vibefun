/**
 * Curry a multi-parameter lambda into nested single-parameter lambdas
 */

import type { Expr, LambdaParam, Location, Pattern, TypeExpr } from "../types/ast.js";
import type { CoreExpr, CorePattern, CoreTypeExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

/**
 * Curry a multi-parameter lambda into nested single-parameter lambdas.
 *
 * Destructuring patterns (record, tuple, list, variant) are lifted into
 * a synthesized match: `(pattern) => body` becomes
 * `($tmpN) => match $tmpN { | pattern => body }`. This keeps `CoreLambda`
 * params restricted to variable/wildcard shapes and reuses the existing
 * match typechecker and codegen for binding extraction. When the original
 * `LambdaParam` carried a type annotation (e.g.
 * `({ x, y }: { x: Int, y: Int })`), the annotation is attached to the
 * synthesized scrutinee so record-pattern inference can see the concrete
 * shape.
 *
 * @param params - List of surface-AST lambda params
 * @param body - Lambda body
 * @param loc - Location of the lambda
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function
 * @param desugarPattern - The desugarPattern function
 * @param desugarTypeExpr - Converts a surface TypeExpr to a CoreTypeExpr
 * @returns Desugared core lambda
 *
 * @example
 * // Input: (x, y, z) => x + y + z
 * // Output: (x) => (y) => (z) => x + y + z
 *
 * @example
 * // Input: ({ x, y }) => x + y
 * // Output: ($param0) => match $param0 { | { x, y } => x + y }
 */
export function curryLambda(
    params: LambdaParam[],
    body: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
    desugarTypeExpr: (typeExpr: TypeExpr) => CoreTypeExpr,
    hasTypeParams: boolean = false,
): CoreExpr {
    // Zero parameters: synthesize a wildcard-pattern lambda so `() => expr`
    // becomes a unit-accepting lambda. The parameter is never referenced, so
    // a wildcard is correct; the typechecker will unify its type with Unit
    // when the lambda is applied (multi-arg call desugaring emits UnitLit for
    // `f()`).
    if (params.length === 0) {
        return {
            kind: "CoreLambda",
            param: { kind: "CoreWildcardPattern", loc },
            body: desugar(body, gen),
            loc,
        };
    }

    return buildLambda(params, 0, body, loc, gen, desugar, desugarPattern, desugarTypeExpr, hasTypeParams);
}

/**
 * Recursively build the curried lambda chain from `params[index..]`.
 */
function buildLambda(
    params: LambdaParam[],
    index: number,
    body: Expr,
    loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
    desugarTypeExpr: (typeExpr: TypeExpr) => CoreTypeExpr,
    hasTypeParams: boolean,
): CoreExpr {
    const param = params[index];
    // Invariant: `index` is controlled by curryLambda (starts at 0, increments
    // by 1, stops at params.length - 1) so this is always in bounds. The
    // check exists to catch refactoring mistakes early.
    if (param === undefined) {
        throw new Error(`Internal error: Lambda parameter at index ${index} is undefined`);
    }

    const isLast = index === params.length - 1;
    const innerBody: CoreExpr = isLast
        ? desugar(body, gen)
        : buildLambda(params, index + 1, body, loc, gen, desugar, desugarPattern, desugarTypeExpr, hasTypeParams);

    const corePattern = desugarPattern(param.pattern, gen);

    // Simple params (variable or wildcard): preserve a user-written annotation
    // by wrapping the body in `let p = ($raw : T) in body` so the typechecker
    // can enforce it at the call site (e.g. reject missing record fields via
    // VF4503). The wrapping is skipped when the enclosing lambda introduces
    // explicit type parameters via `<T>` — those annotations reference
    // erased generic vars, and keeping the current "drop" behaviour lets HM
    // recover the polymorphic type without the typechecker seeing stray
    // `Const("T")` references.
    if (corePattern.kind === "CoreVarPattern" || corePattern.kind === "CoreWildcardPattern") {
        if (!param.type || hasTypeParams) {
            return {
                kind: "CoreLambda",
                param: corePattern,
                body: innerBody,
                loc,
            };
        }
        const rawName = gen.fresh("param");
        const paramLoc = param.pattern.loc;
        const annotatedRaw: CoreExpr = {
            kind: "CoreTypeAnnotation",
            expr: { kind: "CoreVar", name: rawName, loc: paramLoc },
            typeExpr: desugarTypeExpr(param.type),
            loc: paramLoc,
        };
        return {
            kind: "CoreLambda",
            param: { kind: "CoreVarPattern", name: rawName, loc: paramLoc },
            body: {
                kind: "CoreLet",
                pattern: corePattern,
                value: annotatedRaw,
                body: innerBody,
                mutable: false,
                recursive: false,
                loc: paramLoc,
            },
            loc,
        };
    }

    // Destructuring param: lift into a synthesized match over a fresh scrutinee.
    const tmpName = gen.fresh("param");
    const paramLoc = param.pattern.loc;

    // If the user annotated the param (e.g. `({ x, y }: { x: Int, y: Int })`),
    // attach the annotation to the scrutinee so pattern inference has a
    // concrete type to check against — record-pattern checking in
    // `typechecker/patterns.ts` requires a concrete Record type rather than
    // a bare type variable.
    let scrutinee: CoreExpr = { kind: "CoreVar", name: tmpName, loc: paramLoc };
    if (param.type && !hasTypeParams) {
        scrutinee = {
            kind: "CoreTypeAnnotation",
            expr: scrutinee,
            typeExpr: desugarTypeExpr(param.type),
            loc: paramLoc,
        };
    }

    return {
        kind: "CoreLambda",
        param: { kind: "CoreVarPattern", name: tmpName, loc: paramLoc },
        body: {
            kind: "CoreMatch",
            expr: scrutinee,
            cases: [
                {
                    pattern: corePattern,
                    body: innerBody,
                    loc: paramLoc,
                },
            ],
            loc: paramLoc,
        },
        loc,
    };
}
