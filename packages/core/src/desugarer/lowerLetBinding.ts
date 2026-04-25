/**
 * Lower a surface `Let` node into its Core form.
 *
 * Both the top-level case "Let" branch in `desugarer.ts` and the
 * block-internal Let lowering in `desugarBlock.ts` produce the same
 * Core shape. The only thing the caller chooses is what to put in the
 * `body` slot:
 *
 * - `desugarer.ts` for `let x = v in body` recursively desugars
 *   `expr.body`.
 * - `desugarBlock.ts` for a Let inside a block uses the running
 *   `result` accumulator (the already-built next sibling in the
 *   block chain).
 *
 * Centralising the `CoreLet` / `CoreLetRecExpr` construction here
 * keeps the two call sites from drifting on `mutable`, `loc`, or the
 * recursive-vs-non-recursive split. Tests exist in
 * `desugarBlock.test.ts` and `lambdas.test.ts`; the cross-path
 * matrix in `tests/e2e/let-binding-matrix.test.ts` covers the
 * downstream typechecking semantics.
 */

import type { Expr, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

type SurfaceLet = Extract<Expr, { kind: "Let" }>;

/**
 * Build a `CoreLet` (non-recursive) or single-binding `CoreLetRecExpr`
 * (recursive) from a surface `Let` node and an externally-supplied body.
 *
 * @param expr - The surface Let node being lowered.
 * @param body - The already-desugared body CoreExpr that the new Let
 * should wrap. The caller decides whether this is `desugar(expr.body)`
 * (Let-as-expression) or the running block accumulator (Let-in-block).
 * @param gen - The shared fresh-var generator.
 * @param desugar - The main desugar callback (passed to avoid cycles).
 * @param desugarPattern - The desugarPattern callback.
 */
export function lowerLetBinding(
    expr: SurfaceLet,
    body: CoreExpr,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CoreExpr {
    const pattern = desugarPattern(expr.pattern, gen);
    const value = desugar(expr.value, gen);
    if (expr.recursive) {
        return {
            kind: "CoreLetRecExpr",
            bindings: [{ pattern, value, mutable: expr.mutable, loc: expr.loc }],
            body,
            loc: expr.loc,
        };
    }
    return {
        kind: "CoreLet",
        pattern,
        value,
        body,
        mutable: expr.mutable,
        loc: expr.loc,
    };
}
