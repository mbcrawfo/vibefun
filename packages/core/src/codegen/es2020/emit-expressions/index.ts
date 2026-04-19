/**
 * Expression emission for ES2020 code generation.
 *
 * Dispatches on CoreExpr.kind to the appropriate sub-module. Sub-files
 * that need to recurse on sub-expressions import `emitExpr` from this
 * index — the resulting module cycle is safe because `emitExpr` is only
 * invoked at runtime, after all modules have finished loading.
 */

import type { CoreExpr } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import { emitRecord, emitRecordAccess, emitRecordUpdate, emitTuple, emitVariant } from "./collections.js";
import { emitLet, emitLetRecExpr, emitMatch } from "./control.js";
import { emitApp, emitLambda } from "./functions.js";
import { emitFloatLit, emitIntLit, emitStringLit } from "./literals.js";
import { emitBinOp, emitUnaryOp } from "./operators.js";
import { emitVar } from "./variables.js";

export { escapeString } from "./escape-string.js";
export { setEmitMatchPattern, setEmitPattern, setExtractPatternNames } from "./shared-state.js";

/**
 * Emit a CoreExpr to JavaScript code
 *
 * @param expr - The expression to emit
 * @param ctx - Emission context
 * @returns JavaScript code string
 */
export function emitExpr(expr: CoreExpr, ctx: EmitContext): string {
    switch (expr.kind) {
        case "CoreIntLit":
            return emitIntLit(expr.value);

        case "CoreFloatLit":
            return emitFloatLit(expr.value);

        case "CoreStringLit":
            return emitStringLit(expr.value);

        case "CoreBoolLit":
            return expr.value ? "true" : "false";

        case "CoreUnitLit":
            return "undefined";

        case "CoreVar":
            return emitVar(expr.name, ctx);

        case "CoreBinOp":
            return emitBinOp(expr, ctx);

        case "CoreUnaryOp":
            return emitUnaryOp(expr, ctx);

        case "CoreLambda":
            return emitLambda(expr, ctx);

        case "CoreApp":
            return emitApp(expr, ctx);

        case "CoreTuple":
            return emitTuple(expr, ctx);

        case "CoreRecord":
            return emitRecord(expr, ctx);

        case "CoreRecordAccess":
            return emitRecordAccess(expr, ctx);

        case "CoreRecordUpdate":
            return emitRecordUpdate(expr, ctx);

        case "CoreVariant":
            return emitVariant(expr, ctx);

        case "CoreLet":
            return emitLet(expr, ctx);

        case "CoreLetRecExpr":
            return emitLetRecExpr(expr, ctx);

        case "CoreMatch":
            return emitMatch(expr, ctx);

        case "CoreTypeAnnotation":
            // Type annotations are erased at runtime
            return emitExpr(expr.expr, ctx);

        case "CoreUnsafe":
            // Unsafe blocks just pass through
            return emitExpr(expr.expr, ctx);

        default: {
            // Exhaustiveness check
            const _exhaustive: never = expr;
            throw new Error(`Internal error: Unknown expression kind: ${(_exhaustive as CoreExpr).kind}`);
        }
    }
}
