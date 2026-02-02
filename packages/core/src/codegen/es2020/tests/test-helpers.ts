/**
 * Test helpers for ES2020 code generator unit tests
 */

import type { Location } from "../../../types/ast.js";
import type { CoreExpr, CorePattern } from "../../../types/core-ast.js";
import type { Type } from "../../../types/environment.js";
import type { EmitContext, EmitMode } from "../context.js";

import { emptyEnv } from "../../../types/environment.js";
import { createContext } from "../context.js";

/**
 * Create a test context with default values
 *
 * @param options - Optional overrides
 * @returns Context suitable for testing
 */
export function createTestContext(options?: {
    mode?: EmitMode;
    indentLevel?: number;
    precedence?: number;
}): EmitContext {
    const ctx = createContext({
        env: emptyEnv(),
        declarationTypes: new Map(),
        mode: options?.mode ?? "statement",
    });

    if (options?.indentLevel !== undefined) {
        ctx.indentLevel = options.indentLevel;
    }
    if (options?.precedence !== undefined) {
        ctx.precedence = options.precedence;
    }

    return ctx;
}

/**
 * Create a dummy location for test AST nodes
 */
export function testLoc(): Location {
    return {
        file: "test.vf",
        line: 1,
        column: 1,
        offset: 0,
    };
}

// =============================================================================
// Expression Builders
// =============================================================================

/**
 * Create an integer literal node
 */
export function intLit(value: number): CoreExpr {
    return { kind: "CoreIntLit", value, loc: testLoc() };
}

/**
 * Create a float literal node
 */
export function floatLit(value: number): CoreExpr {
    return { kind: "CoreFloatLit", value, loc: testLoc() };
}

/**
 * Create a string literal node
 */
export function stringLit(value: string): CoreExpr {
    return { kind: "CoreStringLit", value, loc: testLoc() };
}

/**
 * Create a boolean literal node
 */
export function boolLit(value: boolean): CoreExpr {
    return { kind: "CoreBoolLit", value, loc: testLoc() };
}

/**
 * Create a unit literal node
 */
export function unitLit(): CoreExpr {
    return { kind: "CoreUnitLit", loc: testLoc() };
}

/**
 * Create a variable reference node
 */
export function varRef(name: string): CoreExpr {
    return { kind: "CoreVar", name, loc: testLoc() };
}

/**
 * Create a binary operation node
 */
export function binOp(
    op: CoreExpr["kind"] extends "CoreBinOp" ? never : string,
    left: CoreExpr,
    right: CoreExpr,
): CoreExpr {
    return {
        kind: "CoreBinOp",
        op: op as "Add", // Type assertion needed
        left,
        right,
        loc: testLoc(),
    };
}

/**
 * Create a unary operation node
 */
export function unaryOp(op: "Negate" | "LogicalNot" | "Deref", expr: CoreExpr): CoreExpr {
    return { kind: "CoreUnaryOp", op, expr, loc: testLoc() };
}

/**
 * Create a lambda node
 */
export function lambda(param: CorePattern, body: CoreExpr): CoreExpr {
    return { kind: "CoreLambda", param, body, loc: testLoc() };
}

/**
 * Create a function application node
 */
export function app(func: CoreExpr, arg: CoreExpr): CoreExpr {
    return { kind: "CoreApp", func, args: [arg], loc: testLoc() };
}

/**
 * Create a tuple node
 */
export function tuple(elements: CoreExpr[]): CoreExpr {
    return { kind: "CoreTuple", elements, loc: testLoc() };
}

/**
 * Create a record node
 */
export function record(fields: Array<{ name: string; value: CoreExpr }>): CoreExpr {
    return {
        kind: "CoreRecord",
        fields: fields.map((f) => ({
            kind: "Field" as const,
            name: f.name,
            value: f.value,
            loc: testLoc(),
        })),
        loc: testLoc(),
    };
}

/**
 * Create a record node with spread
 */
export function recordWithSpread(baseRecord: CoreExpr, fields: Array<{ name: string; value: CoreExpr }>): CoreExpr {
    const allFields = [
        { kind: "Spread" as const, expr: baseRecord, loc: testLoc() },
        ...fields.map((f) => ({
            kind: "Field" as const,
            name: f.name,
            value: f.value,
            loc: testLoc(),
        })),
    ];
    return {
        kind: "CoreRecord",
        fields: allFields,
        loc: testLoc(),
    };
}

/**
 * Create a record access node
 */
export function recordAccess(record: CoreExpr, field: string): CoreExpr {
    return { kind: "CoreRecordAccess", record, field, loc: testLoc() };
}

/**
 * Create a record update node
 */
export function recordUpdate(record: CoreExpr, updates: Array<{ name: string; value: CoreExpr }>): CoreExpr {
    return {
        kind: "CoreRecordUpdate",
        record,
        updates: updates.map((u) => ({
            kind: "Field" as const,
            name: u.name,
            value: u.value,
            loc: testLoc(),
        })),
        loc: testLoc(),
    };
}

/**
 * Create a variant constructor node
 */
export function variant(constructor: string, args: CoreExpr[]): CoreExpr {
    return { kind: "CoreVariant", constructor, args, loc: testLoc() };
}

/**
 * Create a let expression node
 */
export function letExpr(
    pattern: CorePattern,
    value: CoreExpr,
    body: CoreExpr,
    options?: { mutable?: boolean; recursive?: boolean },
): CoreExpr {
    return {
        kind: "CoreLet",
        pattern,
        value,
        body,
        mutable: options?.mutable ?? false,
        recursive: options?.recursive ?? false,
        loc: testLoc(),
    };
}

/**
 * Create a mutually recursive let expression node
 */
export function letRecExpr(
    bindings: Array<{ pattern: CorePattern; value: CoreExpr; mutable?: boolean }>,
    body: CoreExpr,
): CoreExpr {
    return {
        kind: "CoreLetRecExpr",
        bindings: bindings.map((b) => ({
            pattern: b.pattern,
            value: b.value,
            mutable: b.mutable ?? false,
            loc: testLoc(),
        })),
        body,
        loc: testLoc(),
    };
}

/**
 * Create a match expression node
 */
export function matchExpr(
    expr: CoreExpr,
    cases: Array<{ pattern: CorePattern; guard?: CoreExpr; body: CoreExpr }>,
): CoreExpr {
    return {
        kind: "CoreMatch",
        expr,
        cases: cases.map((c) => {
            const caseNode: {
                pattern: CorePattern;
                guard?: CoreExpr;
                body: CoreExpr;
                loc: Location;
            } = {
                pattern: c.pattern,
                body: c.body,
                loc: testLoc(),
            };
            if (c.guard !== undefined) {
                caseNode.guard = c.guard;
            }
            return caseNode;
        }),
        loc: testLoc(),
    };
}

// =============================================================================
// Pattern Builders
// =============================================================================

/**
 * Create a wildcard pattern node
 */
export function wildcardPat(): CorePattern {
    return { kind: "CoreWildcardPattern", loc: testLoc() };
}

/**
 * Create a variable pattern node
 */
export function varPat(name: string): CorePattern {
    return { kind: "CoreVarPattern", name, loc: testLoc() };
}

/**
 * Create a literal pattern node
 */
export function literalPat(literal: number | string | boolean | null): CorePattern {
    return { kind: "CoreLiteralPattern", literal, loc: testLoc() };
}

/**
 * Create a tuple pattern node
 */
export function tuplePat(elements: CorePattern[]): CorePattern {
    return { kind: "CoreTuplePattern", elements, loc: testLoc() };
}

/**
 * Create a record pattern node
 */
export function recordPat(fields: Array<{ name: string; pattern: CorePattern }>): CorePattern {
    return {
        kind: "CoreRecordPattern",
        fields: fields.map((f) => ({
            name: f.name,
            pattern: f.pattern,
            loc: testLoc(),
        })),
        loc: testLoc(),
    };
}

/**
 * Create a variant pattern node
 */
export function variantPat(constructor: string, args: CorePattern[]): CorePattern {
    return { kind: "CoreVariantPattern", constructor, args, loc: testLoc() };
}

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Create an Int type
 */
export function intType(): Type {
    return { type: "Const", name: "Int" };
}

/**
 * Create a Float type
 */
export function floatType(): Type {
    return { type: "Const", name: "Float" };
}

/**
 * Create a String type
 */
export function stringType(): Type {
    return { type: "Const", name: "String" };
}

/**
 * Create a Bool type
 */
export function boolType(): Type {
    return { type: "Const", name: "Bool" };
}

/**
 * Create a record type
 */
export function recordType(fields: Record<string, Type>): Type {
    return { type: "Record", fields: new Map(Object.entries(fields)) };
}

/**
 * Create a tuple type
 */
export function tupleType(elements: Type[]): Type {
    return { type: "Tuple", elements };
}
