/**
 * Desugar a block expression into nested let bindings
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

/**
 * Desugar a block expression into nested let bindings
 *
 * @param exprs - List of expressions in the block
 * @param loc - Location of the block expression
 * @param gen - Fresh variable generator
 * @param desugar - The main desugar function
 * @param desugarPattern - The desugarPattern function
 * @returns Desugared core expression
 *
 * @example
 * // Input: { let x = 10; let y = 20; x + y }
 * // Output: let x = 10 in (let y = 20 in (x + y))
 */
export function desugarBlock(
    exprs: Expr[],
    _loc: Location,
    gen: FreshVarGen,
    desugar: (expr: Expr, gen: FreshVarGen) => CoreExpr,
    desugarPattern: (pattern: Pattern, gen: FreshVarGen) => CorePattern,
): CoreExpr {
    // Empty block evaluates to unit (spec: empty blocks are valid and have Unit type)
    if (exprs.length === 0) {
        return { kind: "CoreUnitLit", loc: _loc };
    }

    // Single expression - just desugar it
    if (exprs.length === 1) {
        const singleExpr = exprs[0];
        if (!singleExpr) {
            // Internal error: array bounds check
            throw new Error("Block has undefined expression");
        }
        return desugar(singleExpr, gen);
    }

    // Multiple expressions - build nested let bindings
    // All expressions except the last should be Let bindings
    const lastExpr = exprs[exprs.length - 1];
    if (!lastExpr) {
        // Internal error: array bounds check
        throw new Error("Block has undefined last expression");
    }

    // Process expressions right-to-left to build nested structure
    let result = desugar(lastExpr, gen);

    // Work backwards through all but the last expression. Non-final
    // expressions may be either `Let` bindings (introducing names) or
    // bare side-effect expressions like `sideEffect();` or `x := 5;`.
    // Bare expressions desugar to `let _ = expr in body`, reusing the
    // wildcard-let path the typechecker and codegen already support.
    for (let i = exprs.length - 2; i >= 0; i--) {
        const expr = exprs[i];
        if (!expr) {
            // Internal error: array bounds check
            throw new Error(`Block has undefined expression at index ${i}`);
        }

        if (expr.kind === "Let") {
            result = {
                kind: "CoreLet",
                pattern: desugarPattern(expr.pattern, gen),
                value: desugar(expr.value, gen),
                body: result,
                mutable: expr.mutable,
                recursive: expr.recursive,
                loc: expr.loc,
            };
        } else {
            result = {
                kind: "CoreLet",
                pattern: { kind: "CoreWildcardPattern", loc: expr.loc },
                value: desugar(expr, gen),
                body: result,
                mutable: false,
                recursive: false,
                loc: expr.loc,
            };
        }
    }

    return result;
}
