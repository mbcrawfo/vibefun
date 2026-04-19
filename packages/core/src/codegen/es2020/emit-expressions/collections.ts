/**
 * Collection emission for ES2020 code generation:
 * tuples, records, record access/update, and variant constructors.
 */

import type { CoreExpr } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import { withPrecedence } from "../context.js";
import { MEMBER_PRECEDENCE } from "../emit-operators.js";
import { emitExpr } from "./index.js";

/**
 * Emit a tuple as a JavaScript array
 */
export function emitTuple(expr: { kind: "CoreTuple"; elements: CoreExpr[] }, ctx: EmitContext): string {
    const elements = expr.elements.map((e) => emitExpr(e, withPrecedence(ctx, 0)));
    return `[${elements.join(", ")}]`;
}

/**
 * Emit a record as a JavaScript object
 *
 * Note: The non-null assertions (!) on field.value and field.expr are safe because
 * the Core AST is guaranteed to be well-formed after type checking. Field nodes
 * always have `value` set, and Spread nodes always have `expr` set.
 */
export function emitRecord(
    expr: { kind: "CoreRecord"; fields: Array<{ kind: string; name?: string; value?: CoreExpr; expr?: CoreExpr }> },
    ctx: EmitContext,
): string {
    const fields = expr.fields.map((field) => {
        if (field.kind === "Field") {
            const value = emitExpr(field.value!, withPrecedence(ctx, 0));
            return `${field.name}: ${value}`;
        } else {
            // Spread
            const spreadExpr = emitExpr(field.expr!, withPrecedence(ctx, 0));
            return `...${spreadExpr}`;
        }
    });
    return `{ ${fields.join(", ")} }`;
}

/**
 * Emit record field access
 */
export function emitRecordAccess(
    expr: { kind: "CoreRecordAccess"; record: CoreExpr; field: string },
    ctx: EmitContext,
): string {
    const recordCode = emitExpr(expr.record, withPrecedence(ctx, MEMBER_PRECEDENCE));
    return `${recordCode}.${expr.field}`;
}

/**
 * Emit a record update (functional update)
 *
 * Note: The non-null assertions (!) on field.value and field.expr are safe because
 * the Core AST is guaranteed to be well-formed after type checking. Field nodes
 * always have `value` set, and Spread nodes always have `expr` set.
 */
export function emitRecordUpdate(
    expr: {
        kind: "CoreRecordUpdate";
        record: CoreExpr;
        updates: Array<{ kind: string; name?: string; value?: CoreExpr; expr?: CoreExpr }>;
    },
    ctx: EmitContext,
): string {
    const recordCode = emitExpr(expr.record, withPrecedence(ctx, 0));
    const updates = expr.updates.map((field) => {
        if (field.kind === "Field") {
            const value = emitExpr(field.value!, withPrecedence(ctx, 0));
            return `${field.name}: ${value}`;
        } else {
            // Spread in updates
            const spreadExpr = emitExpr(field.expr!, withPrecedence(ctx, 0));
            return `...${spreadExpr}`;
        }
    });
    return `{ ...${recordCode}, ${updates.join(", ")} }`;
}

/**
 * Emit a variant constructor
 *
 * Zero-arg: { $tag: "Name" }
 * With args: { $tag: "Name", $0: arg0, $1: arg1, ... }
 */
export function emitVariant(
    expr: { kind: "CoreVariant"; constructor: string; args: CoreExpr[] },
    ctx: EmitContext,
): string {
    if (expr.args.length === 0) {
        return `{ $tag: "${expr.constructor}" }`;
    }

    const args = expr.args.map((arg, i) => {
        const argCode = emitExpr(arg, withPrecedence(ctx, 0));
        return `$${i}: ${argCode}`;
    });

    return `{ $tag: "${expr.constructor}", ${args.join(", ")} }`;
}
