/**
 * Expression emission for ES2020 code generation
 *
 * This module handles the emission of all CoreExpr nodes to JavaScript.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";

import { markNeedsEqHelper, markNeedsRefHelper, withPrecedence } from "./context.js";
import {
    CALL_PRECEDENCE,
    getBinaryPrecedence,
    getUnaryPrecedence,
    JS_BINARY_OP,
    MEMBER_PRECEDENCE,
    needsParens,
} from "./emit-operators.js";
import { escapeIdentifier } from "./reserved-words.js";

// =============================================================================
// Dependency Injection for Circular Dependencies
// =============================================================================

// Forward declaration for pattern emission (set by generator.ts)
let emitPatternFn: (pattern: unknown, ctx: EmitContext) => string = () => {
    throw new Error("emitPatternFn not initialized - setEmitPattern must be called first");
};

// Forward declaration for extracting pattern names (set by generator.ts)
let extractPatternNamesFn: (pattern: unknown) => string[] = () => {
    throw new Error("extractPatternNamesFn not initialized - setExtractPatternNames must be called first");
};

/**
 * Set the pattern emission function (called during initialization)
 */
export function setEmitPattern(fn: typeof emitPatternFn): void {
    emitPatternFn = fn;
}

/**
 * Set the pattern name extraction function (called during initialization)
 */
export function setExtractPatternNames(fn: typeof extractPatternNamesFn): void {
    extractPatternNamesFn = fn;
}

// =============================================================================
// String Escaping
// =============================================================================

/**
 * Escape a string for use in a JavaScript string literal
 *
 * Handles:
 * - Control characters (\n, \t, \r, etc.)
 * - Backslash and quote escaping
 * - Unicode line separators (U+2028, U+2029) - MUST be escaped in JS strings
 * - Other non-printable characters
 */
export function escapeString(str: string): string {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const char = str.charAt(i);
        const code = char.charCodeAt(0);

        switch (char) {
            case "\\":
                result += "\\\\";
                break;
            case '"':
                result += '\\"';
                break;
            case "\n":
                result += "\\n";
                break;
            case "\r":
                result += "\\r";
                break;
            case "\t":
                result += "\\t";
                break;
            case "\b":
                result += "\\b";
                break;
            case "\f":
                result += "\\f";
                break;
            case "\v":
                result += "\\v";
                break;
            case "\0": {
                // When null byte is followed by a digit, use \x00 to avoid
                // invalid octal escape sequences (e.g., \01 would be octal)
                const next = str.charAt(i + 1);
                const needsHex = next >= "0" && next <= "9";
                result += needsHex ? "\\x00" : "\\0";
                break;
            }
            default:
                // U+2028 (Line Separator) and U+2029 (Paragraph Separator)
                // These are valid in JS strings but MUST be escaped in string literals
                // because they're line terminators
                if (code === 0x2028) {
                    result += "\\u2028";
                } else if (code === 0x2029) {
                    result += "\\u2029";
                } else if (code < 0x20) {
                    // Other control characters (0x00-0x1F, excluding handled ones)
                    result += "\\x" + code.toString(16).padStart(2, "0");
                } else {
                    result += char;
                }
        }
    }
    return result;
}

// =============================================================================
// Main Expression Emitter
// =============================================================================

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

// =============================================================================
// Literal Emission
// =============================================================================

/**
 * Emit an integer literal
 * Negative numbers are wrapped in parentheses to avoid ambiguity
 */
function emitIntLit(value: number): string {
    if (value < 0) {
        return `(${value})`;
    }
    return String(value);
}

/**
 * Emit a float literal
 * Handles special cases: Infinity, -Infinity, NaN, -0
 */
function emitFloatLit(value: number): string {
    if (Number.isNaN(value)) {
        return "NaN";
    }
    if (value === Infinity) {
        return "Infinity";
    }
    if (value === -Infinity) {
        return "(-Infinity)";
    }
    // Check for negative zero
    if (Object.is(value, -0)) {
        return "(-0)";
    }
    if (value < 0) {
        return `(${value})`;
    }
    // Ensure float representation (add .0 if needed)
    const str = String(value);
    if (!str.includes(".") && !str.includes("e") && !str.includes("E")) {
        return str + ".0";
    }
    return str;
}

/**
 * Emit a string literal with proper escaping
 */
function emitStringLit(value: string): string {
    return `"${escapeString(value)}"`;
}

// =============================================================================
// Variable Emission
// =============================================================================

/**
 * Emit a variable reference
 *
 * Checks if the variable is an external binding and uses jsName if so.
 * Also escapes reserved words.
 */
function emitVar(name: string, ctx: EmitContext): string {
    // Check if this is an external binding
    const binding = ctx.env.values.get(name);
    if (binding) {
        if (binding.kind === "External" || binding.kind === "ExternalOverload") {
            // Use the JavaScript name instead of the vibefun name
            // Don't escape external JS names (they may be dotted like Math.floor)
            return binding.jsName;
        }
    }

    // Regular variable - escape if reserved
    return escapeIdentifier(name);
}

// =============================================================================
// Operator Emission
// =============================================================================

/**
 * Check if a type is a primitive type (uses === for equality)
 */
function isPrimitiveType(typeName: string): boolean {
    return (
        typeName === "Int" ||
        typeName === "Float" ||
        typeName === "String" ||
        typeName === "Bool" ||
        typeName === "Unit"
    );
}

/**
 * Determine if an expression has a primitive type
 * Used for deciding between === and $eq for equality
 */
function isExprPrimitive(expr: CoreExpr, ctx: EmitContext): boolean {
    // For variables, look up their type
    if (expr.kind === "CoreVar") {
        // Check declaration types first
        const declType = ctx.declarationTypes.get(expr.name);
        if (declType && declType.type === "Const") {
            return isPrimitiveType(declType.name);
        }
        // Check environment
        const binding = ctx.env.values.get(expr.name);
        if (binding && binding.kind === "Value") {
            const t = binding.scheme.type;
            if (t.type === "Const") {
                return isPrimitiveType(t.name);
            }
        }
        // Unknown type - conservatively use $eq
        return false;
    }

    // Literals are always primitive
    if (
        expr.kind === "CoreIntLit" ||
        expr.kind === "CoreFloatLit" ||
        expr.kind === "CoreStringLit" ||
        expr.kind === "CoreBoolLit" ||
        expr.kind === "CoreUnitLit"
    ) {
        return true;
    }

    // Records, tuples, variants are composite
    if (expr.kind === "CoreRecord" || expr.kind === "CoreTuple" || expr.kind === "CoreVariant") {
        return false;
    }

    // For other expressions, conservatively use $eq
    return false;
}

/**
 * Emit a binary operation
 */
function emitBinOp(expr: { kind: "CoreBinOp"; op: string; left: CoreExpr; right: CoreExpr }, ctx: EmitContext): string {
    const op = expr.op;
    const prec = getBinaryPrecedence(op as Parameters<typeof getBinaryPrecedence>[0]);

    // Handle special operators
    if (op === "Divide") {
        throw new Error("Internal error: Unlowered Divide operator reached codegen (typechecker bug)");
    }

    if (op === "IntDivide") {
        // Math.trunc(a / b)
        const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
        const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec));
        const code = `Math.trunc(${leftCode} / ${rightCode})`;
        return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
    }

    if (op === "RefAssign") {
        // (a.$value = b, undefined)
        markNeedsRefHelper(ctx);
        const leftCode = emitExpr(expr.left, withPrecedence(ctx, MEMBER_PRECEDENCE));
        const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
        return `(${leftCode}.$value = ${rightCode}, undefined)`;
    }

    if (op === "Equal" || op === "NotEqual") {
        // Check if we need structural equality
        const usePrimitive = isExprPrimitive(expr.left, ctx) && isExprPrimitive(expr.right, ctx);

        if (usePrimitive) {
            const jsOp = op === "Equal" ? "===" : "!==";
            const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
            const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec));
            const code = `${leftCode} ${jsOp} ${rightCode}`;
            return maybeParens(code, prec, ctx.precedence);
        } else {
            // Use $eq helper
            markNeedsEqHelper(ctx);
            const leftCode = emitExpr(expr.left, withPrecedence(ctx, 0));
            const rightCode = emitExpr(expr.right, withPrecedence(ctx, 0));
            if (op === "Equal") {
                return maybeParens(`$eq(${leftCode}, ${rightCode})`, CALL_PRECEDENCE, ctx.precedence);
            } else {
                return maybeParens(`!$eq(${leftCode}, ${rightCode})`, getUnaryPrecedence("LogicalNot"), ctx.precedence);
            }
        }
    }

    // Standard binary operators
    const jsOp = JS_BINARY_OP[op as keyof typeof JS_BINARY_OP];
    if (jsOp === null) {
        throw new Error(`Internal error: No JS operator for ${op}`);
    }

    const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
    const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec + 1)); // +1 for right associativity handling
    const code = `${leftCode} ${jsOp} ${rightCode}`;

    return maybeParens(code, prec, ctx.precedence);
}

/**
 * Emit a unary operation
 */
function emitUnaryOp(expr: { kind: "CoreUnaryOp"; op: string; expr: CoreExpr }, ctx: EmitContext): string {
    const op = expr.op;
    const prec = getUnaryPrecedence(op as Parameters<typeof getUnaryPrecedence>[0]);

    if (op === "Deref") {
        // x.$value
        markNeedsRefHelper(ctx);
        const innerCode = emitExpr(expr.expr, withPrecedence(ctx, MEMBER_PRECEDENCE));
        return maybeParens(`${innerCode}.$value`, MEMBER_PRECEDENCE, ctx.precedence);
    }

    // Negate or LogicalNot
    const jsOp = op === "Negate" ? "-" : "!";
    const innerCode = emitExpr(expr.expr, withPrecedence(ctx, prec));
    const code = `${jsOp}${innerCode}`;

    return maybeParens(code, prec, ctx.precedence);
}

/**
 * Wrap code in parentheses if needed based on precedence
 */
function maybeParens(code: string, innerPrec: number, outerPrec: number): string {
    if (needsParens(innerPrec, outerPrec)) {
        return `(${code})`;
    }
    return code;
}

// =============================================================================
// Function Emission
// =============================================================================

/**
 * Emit a lambda expression
 */
function emitLambda(expr: { kind: "CoreLambda"; param: unknown; body: CoreExpr }, ctx: EmitContext): string {
    const paramCode = emitPatternFn(expr.param, ctx);
    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    // Use concise arrow function syntax
    const code = `(${paramCode}) => ${bodyCode}`;

    // Arrow functions have very low precedence
    return maybeParens(code, 2, ctx.precedence);
}

/**
 * Emit a function application
 * Note: CoreApp.args is always a single-element array (curried)
 */
function emitApp(expr: { kind: "CoreApp"; func: CoreExpr; args: CoreExpr[] }, ctx: EmitContext): string {
    const funcCode = emitExpr(expr.func, withPrecedence(ctx, CALL_PRECEDENCE));
    // Args is always single-element in core AST
    const arg = expr.args[0];
    if (arg === undefined) {
        throw new Error("Internal error: CoreApp.args is empty");
    }
    const argCode = emitExpr(arg, withPrecedence(ctx, 0));
    const code = `${funcCode}(${argCode})`;

    return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
}

// =============================================================================
// Data Structure Emission
// =============================================================================

/**
 * Emit a tuple as a JavaScript array
 */
function emitTuple(expr: { kind: "CoreTuple"; elements: CoreExpr[] }, ctx: EmitContext): string {
    const elements = expr.elements.map((e) => emitExpr(e, withPrecedence(ctx, 0)));
    return `[${elements.join(", ")}]`;
}

/**
 * Emit a record as a JavaScript object
 */
function emitRecord(
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
function emitRecordAccess(
    expr: { kind: "CoreRecordAccess"; record: CoreExpr; field: string },
    ctx: EmitContext,
): string {
    const recordCode = emitExpr(expr.record, withPrecedence(ctx, MEMBER_PRECEDENCE));
    return `${recordCode}.${expr.field}`;
}

/**
 * Emit a record update (functional update)
 */
function emitRecordUpdate(
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
function emitVariant(expr: { kind: "CoreVariant"; constructor: string; args: CoreExpr[] }, ctx: EmitContext): string {
    if (expr.args.length === 0) {
        return `{ $tag: "${expr.constructor}" }`;
    }

    const args = expr.args.map((arg, i) => {
        const argCode = emitExpr(arg, withPrecedence(ctx, 0));
        return `$${i}: ${argCode}`;
    });

    return `{ $tag: "${expr.constructor}", ${args.join(", ")} }`;
}

// =============================================================================
// Let and Match Emission (Stubs - will be implemented in later phases)
// =============================================================================

/**
 * Emit a let expression
 */
function emitLet(
    expr: { kind: "CoreLet"; pattern: unknown; value: CoreExpr; body: CoreExpr; mutable: boolean; recursive: boolean },
    ctx: EmitContext,
): string {
    // For mutable bindings, track ref helper
    if (expr.mutable) {
        markNeedsRefHelper(ctx);
    }

    // In expression context, use IIFE
    // In statement context, emit const/let declaration
    // For now, always use IIFE (expression context)
    const patternCode = emitPatternFn(expr.pattern, ctx);
    const valueCode = expr.mutable
        ? `{ $value: ${emitExpr(expr.value, withPrecedence(ctx, 0))} }`
        : emitExpr(expr.value, withPrecedence(ctx, 0));
    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    const keyword = expr.recursive ? "let" : "const";

    return `(() => { ${keyword} ${patternCode} = ${valueCode}; return ${bodyCode}; })()`;
}

/**
 * Emit a mutually recursive let expression
 *
 * For let rec, we need to declare variables first (forward references),
 * then assign. JavaScript destructuring requires initializers, so we
 * extract variable names for declarations and use full patterns for assignments.
 */
function emitLetRecExpr(
    expr: {
        kind: "CoreLetRecExpr";
        bindings: Array<{ pattern: unknown; value: CoreExpr; mutable: boolean }>;
        body: CoreExpr;
    },
    ctx: EmitContext,
): string {
    // Use IIFE with let declarations for forward references
    const declarations: string[] = [];
    const assignments: string[] = [];

    for (const binding of expr.bindings) {
        // Extract variable names for forward declaration (destructuring needs initializer)
        const names = extractPatternNamesFn(binding.pattern).map(escapeIdentifier);
        declarations.push(...names);

        // Use full pattern for assignment
        const patternCode = emitPatternFn(binding.pattern, ctx);
        const valueCode = binding.mutable
            ? `{ $value: ${emitExpr(binding.value, withPrecedence(ctx, 0))} }`
            : emitExpr(binding.value, withPrecedence(ctx, 0));
        assignments.push(`${patternCode} = ${valueCode}`);

        if (binding.mutable) {
            markNeedsRefHelper(ctx);
        }
    }

    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    const declLine = declarations.length > 0 ? `let ${declarations.join(", ")}; ` : "";
    return `(() => { ${declLine}${assignments.join("; ")}; return ${bodyCode}; })()`;
}

// Forward declaration for match pattern emission (set by generator.ts)
let emitMatchPatternFn: (
    pattern: unknown,
    scrutinee: string,
    ctx: EmitContext,
) => { condition: string | null; bindings: string[] } = () => {
    throw new Error("emitMatchPatternFn not initialized - setEmitMatchPattern must be called first");
};

/**
 * Set the match pattern emission function (called during initialization)
 */
export function setEmitMatchPattern(fn: typeof emitMatchPatternFn): void {
    emitMatchPatternFn = fn;
}

/**
 * Emit a match expression
 *
 * Uses IIFE with if-chain for pattern matching.
 *
 * Generated structure:
 * ```javascript
 * (() => {
 *   const $match = <scrutinee>;
 *   if (<condition1>) { <bindings1>; return <body1>; }
 *   if (<condition2>) { <bindings2>; return <body2>; }
 *   ...
 *   throw new Error("Match exhausted"); // fallback
 * })()
 * ```
 */
function emitMatch(
    expr: { kind: "CoreMatch"; expr: CoreExpr; cases: Array<{ pattern: unknown; guard?: CoreExpr; body: CoreExpr }> },
    ctx: EmitContext,
): string {
    const indent = ctx.indentString.repeat(ctx.indentLevel);
    const indent1 = ctx.indentString.repeat(ctx.indentLevel + 1);

    const scrutineeCode = emitExpr(expr.expr, withPrecedence(ctx, 0));

    // Generate IIFE with if-chain
    const lines: string[] = [];
    lines.push(`(() => {`);
    lines.push(`${indent1}const $match = ${scrutineeCode};`);

    for (let i = 0; i < expr.cases.length; i++) {
        const matchCase = expr.cases[i];
        if (matchCase === undefined) {
            continue;
        }

        // Get pattern condition and bindings
        const patternResult = emitMatchPatternFn(matchCase.pattern, "$match", ctx);
        const bodyCode = emitExpr(matchCase.body, withPrecedence(ctx, 0));

        // Build the full condition (pattern + guard)
        let fullCondition = patternResult.condition;

        if (matchCase.guard !== undefined) {
            const guardCode = emitExpr(matchCase.guard, withPrecedence(ctx, 0));
            if (fullCondition !== null) {
                fullCondition = `${fullCondition} && ${guardCode}`;
            } else {
                fullCondition = guardCode;
            }
        }

        // Generate bindings as variable declarations
        const bindingsCode = patternResult.bindings.join(" ");

        if (fullCondition === null) {
            // Unconditional match (wildcard or variable without guard)
            if (bindingsCode) {
                lines.push(`${indent1}${bindingsCode} return ${bodyCode};`);
            } else {
                lines.push(`${indent1}return ${bodyCode};`);
            }
            // No need for fallback after unconditional match
            break;
        } else {
            // Conditional match
            if (bindingsCode) {
                lines.push(`${indent1}if (${fullCondition}) { ${bindingsCode} return ${bodyCode}; }`);
            } else {
                lines.push(`${indent1}if (${fullCondition}) { return ${bodyCode}; }`);
            }
        }
    }

    // Add exhaustiveness fallback (should be unreachable if typechecker ensures exhaustiveness)
    const lastCase = expr.cases[expr.cases.length - 1];
    if (lastCase !== undefined) {
        const lastPatternResult = emitMatchPatternFn(lastCase.pattern, "$match", ctx);
        // Only add fallback if the last case has a condition
        if (lastPatternResult.condition !== null || lastCase.guard !== undefined) {
            lines.push(`${indent1}throw new Error("Match exhausted");`);
        }
    }

    lines.push(`${indent}})()`);

    return lines.join("\n");
}
