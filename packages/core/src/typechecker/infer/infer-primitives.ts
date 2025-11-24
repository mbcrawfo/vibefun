/**
 * Type inference for primitive expressions
 *
 * Handles literals, variables, type annotations, and unsafe blocks.
 * Contains the main inferExpr dispatcher function.
 */

import type { CoreExpr, CoreTypeExpr } from "../../types/core-ast.js";
import type { Type, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { TypeError } from "../../utils/error.js";
import { constType, funType, primitiveTypes, typeToString } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";
import { instantiate } from "./infer-context.js";

// Import functions from other infer modules
// These will be set via dependency injection in index.ts
// Initialized to error-throwing functions for type safety and better error messages
let inferLambdaFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLambda" }>) => InferResult = () => {
    throw new Error("inferLambdaFn not initialized - setInferenceFunctions must be called first");
};
let inferAppFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreApp" }>) => InferResult = () => {
    throw new Error("inferAppFn not initialized - setInferenceFunctions must be called first");
};
let inferBinOpFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreBinOp" }>) => InferResult = () => {
    throw new Error("inferBinOpFn not initialized - setInferenceFunctions must be called first");
};
let inferUnaryOpFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreUnaryOp" }>) => InferResult = () => {
    throw new Error("inferUnaryOpFn not initialized - setInferenceFunctions must be called first");
};
let inferLetFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLet" }>) => InferResult = () => {
    throw new Error("inferLetFn not initialized - setInferenceFunctions must be called first");
};
let inferLetRecExprFn: (
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreLetRecExpr" }>,
) => InferResult = () => {
    throw new Error("inferLetRecExprFn not initialized - setInferenceFunctions must be called first");
};
let inferRecordFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreRecord" }>) => InferResult = () => {
    throw new Error("inferRecordFn not initialized - setInferenceFunctions must be called first");
};
let inferRecordAccessFn: (
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreRecordAccess" }>,
) => InferResult = () => {
    throw new Error("inferRecordAccessFn not initialized - setInferenceFunctions must be called first");
};
let inferRecordUpdateFn: (
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreRecordUpdate" }>,
) => InferResult = () => {
    throw new Error("inferRecordUpdateFn not initialized - setInferenceFunctions must be called first");
};
let inferVariantFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreVariant" }>) => InferResult = () => {
    throw new Error("inferVariantFn not initialized - setInferenceFunctions must be called first");
};
let inferMatchFn: (ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreMatch" }>) => InferResult = () => {
    throw new Error("inferMatchFn not initialized - setInferenceFunctions must be called first");
};

/**
 * Set up dependency injection for other inference functions
 */
export function setInferenceFunctions(fns: {
    inferLambda: typeof inferLambdaFn;
    inferApp: typeof inferAppFn;
    inferBinOp: typeof inferBinOpFn;
    inferUnaryOp: typeof inferUnaryOpFn;
    inferLet: typeof inferLetFn;
    inferLetRecExpr: typeof inferLetRecExprFn;
    inferRecord: typeof inferRecordFn;
    inferRecordAccess: typeof inferRecordAccessFn;
    inferRecordUpdate: typeof inferRecordUpdateFn;
    inferVariant: typeof inferVariantFn;
    inferMatch: typeof inferMatchFn;
}): void {
    inferLambdaFn = fns.inferLambda;
    inferAppFn = fns.inferApp;
    inferBinOpFn = fns.inferBinOp;
    inferUnaryOpFn = fns.inferUnaryOp;
    inferLetFn = fns.inferLet;
    inferLetRecExprFn = fns.inferLetRecExpr;
    inferRecordFn = fns.inferRecord;
    inferRecordAccessFn = fns.inferRecordAccess;
    inferRecordUpdateFn = fns.inferRecordUpdate;
    inferVariantFn = fns.inferVariant;
    inferMatchFn = fns.inferMatch;
}

/**
 * Infer the type of an expression
 *
 * Main dispatcher function that delegates to specialized inference functions.
 *
 * @param ctx - The inference context
 * @param expr - The expression to infer the type of
 * @returns The inferred type and updated substitution
 * @throws {TypeError} If type inference fails
 */
export function inferExpr(ctx: InferenceContext, expr: CoreExpr): InferResult {
    switch (expr.kind) {
        // Literals
        case "CoreIntLit":
            return { type: primitiveTypes.Int, subst: ctx.subst };

        case "CoreFloatLit":
            return { type: primitiveTypes.Float, subst: ctx.subst };

        case "CoreStringLit":
            return { type: primitiveTypes.String, subst: ctx.subst };

        case "CoreBoolLit":
            return { type: primitiveTypes.Bool, subst: ctx.subst };

        case "CoreUnitLit":
            return { type: primitiveTypes.Unit, subst: ctx.subst };

        // Variables
        case "CoreVar":
            return inferVar(ctx, expr.name, expr.loc);

        // Lambdas
        case "CoreLambda":
            return inferLambdaFn(ctx, expr);

        // Applications
        case "CoreApp":
            return inferAppFn(ctx, expr);

        // Binary operations
        case "CoreBinOp":
            return inferBinOpFn(ctx, expr);

        // Unary operations
        case "CoreUnaryOp":
            return inferUnaryOpFn(ctx, expr);

        // Type annotations
        case "CoreTypeAnnotation":
            return inferTypeAnnotation(ctx, expr);

        // Let bindings
        case "CoreLet":
            return inferLetFn(ctx, expr);

        case "CoreLetRecExpr":
            return inferLetRecExprFn(ctx, expr);

        // Records
        case "CoreRecord":
            return inferRecordFn(ctx, expr);

        case "CoreRecordAccess":
            return inferRecordAccessFn(ctx, expr);

        case "CoreRecordUpdate":
            return inferRecordUpdateFn(ctx, expr);

        // Variants
        case "CoreVariant":
            return inferVariantFn(ctx, expr);

        // Unsafe blocks
        case "CoreUnsafe":
            return inferUnsafe(ctx, expr);

        // Pattern matching
        case "CoreMatch":
            return inferMatchFn(ctx, expr);

        // Tuple expressions (placeholder)
        case "CoreTuple":
            throw new TypeError("Tuple type inference not yet implemented", expr.loc);
    }
}

/**
 * Infer the type of a variable
 *
 * Looks up the variable in the environment and instantiates its type scheme.
 *
 * @param ctx - The inference context
 * @param name - The variable name
 * @param loc - Source location for error reporting
 * @returns The inferred type and updated substitution
 * @throws {TypeError} If the variable is not found
 */
function inferVar(
    ctx: InferenceContext,
    name: string,
    loc: { file: string; line: number; column: number; offset: number },
): InferResult {
    const binding = ctx.env.values.get(name);

    if (!binding) {
        throw new TypeError(`Undefined variable '${name}'`, loc, `Variable '${name}' is not in scope`);
    }

    // Get the type scheme based on binding kind
    let scheme: TypeScheme;
    if (binding.kind === "Value" || binding.kind === "External") {
        scheme = binding.scheme;
    } else {
        // ExternalOverload case - not yet supported
        throw new TypeError(
            `Overloaded external '${name}' not yet supported`,
            loc,
            `Overload resolution is planned for a future release`,
        );
    }

    // Instantiate the type scheme
    const type = instantiate(scheme, ctx.level);

    return { type, subst: ctx.subst };
}

/**
 * Infer the type of a type-annotated expression
 *
 * Infers the expression type and unifies it with the annotation.
 *
 * @param ctx - The inference context
 * @param expr - The type annotation expression
 * @returns The inferred type and updated substitution
 */
function inferTypeAnnotation(
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreTypeAnnotation" }>,
): InferResult {
    // Infer expression type
    const exprResult = inferExpr(ctx, expr.expr);

    // Convert type expression to Type
    const annotationType = convertTypeExpr(expr.typeExpr);

    // Unify inferred type with annotation
    try {
        const unifySubst = unify(exprResult.type, annotationType);
        const finalSubst = composeSubst(unifySubst, exprResult.subst);

        // Return annotation type (after substitution)
        const finalType = applySubst(finalSubst, annotationType);

        return { type: finalType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type annotation mismatch`,
            expr.loc,
            `Expected ${typeToString(annotationType)}, but expression has type ${typeToString(exprResult.type)}`,
        );
    }
}

/**
 * Infer the type of an unsafe block
 *
 * Unsafe blocks allow arbitrary expressions but still type check them.
 * The "unsafe" designation marks boundaries where external/untrusted code interacts.
 *
 * @param ctx - The inference context
 * @param expr - The unsafe block expression
 * @returns The inferred type and updated substitution
 */
function inferUnsafe(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreUnsafe" }>): InferResult {
    // Simply infer the type of the inner expression
    // The "unsafe" designation is more of a marker for code generation and documentation
    return inferExpr(ctx, expr.expr);
}

/**
 * Convert a CoreTypeExpr to a Type
 *
 * Converts surface syntax type expressions to internal Type representation.
 *
 * @param typeExpr - The type expression to convert
 * @returns The corresponding Type
 */
export function convertTypeExpr(typeExpr: CoreTypeExpr): Type {
    switch (typeExpr.kind) {
        case "CoreTypeConst":
            return constType(typeExpr.name);

        case "CoreFunctionType":
            return funType(typeExpr.params.map(convertTypeExpr), convertTypeExpr(typeExpr.return_));

        case "CoreTypeApp": {
            const constructor = convertTypeExpr(typeExpr.constructor);
            const args = typeExpr.args.map(convertTypeExpr);
            return {
                type: "App",
                constructor,
                args,
            };
        }

        case "CoreTypeVar":
            // Type variables in type expressions are not supported yet
            // These would require generics/parametric types in user-defined types
            throw new TypeError(
                `Type variables are not yet supported in type annotations`,
                typeExpr.loc,
                `Type variable '${typeExpr.name}' cannot be used here`,
            );

        case "CoreRecordType": {
            // Convert record type: { field1: Type1, field2: Type2 }
            const fields = new Map<string, Type>();
            for (const field of typeExpr.fields) {
                fields.set(field.name, convertTypeExpr(field.typeExpr));
            }
            return {
                type: "Record",
                fields,
            };
        }

        case "CoreVariantType":
            // Variant types in annotations are not fully supported
            // Users should reference named types instead
            throw new TypeError(
                `Inline variant types are not supported in type annotations`,
                typeExpr.loc,
                `Define a named variant type with 'type' declaration instead`,
            );

        case "CoreUnionType": {
            // Convert union type: Type1 | Type2 | Type3
            const types = typeExpr.types.map(convertTypeExpr);
            return {
                type: "Union",
                types,
            };
        }

        case "CoreTupleType": {
            // Convert tuple type: (Type1, Type2, Type3)
            const elements = typeExpr.elements.map(convertTypeExpr);
            return {
                type: "Tuple",
                elements,
            };
        }
    }
}
