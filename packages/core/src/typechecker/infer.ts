/**
 * Type inference engine (Algorithm W)
 *
 * This module implements Hindley-Milner type inference for the vibefun language.
 * It uses Algorithm W with level-based generalization for let-polymorphism.
 */

import type { CoreBinaryOp, CoreExpr, CoreTypeExpr, CoreUnary } from "../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../types/environment.js";
import type { Substitution } from "./unify.js";

import { TypeError } from "../utils/error.js";
import { constType, freshTypeVar, funType, primitiveTypes, typeToString } from "./types.js";
import { applySubst, composeSubst, emptySubst, unify } from "./unify.js";

/**
 * Inference context
 *
 * Manages state during type inference including the type environment,
 * current substitution, and level for type variable scoping.
 */
export type InferenceContext = {
    /** Type environment mapping names to type schemes */
    env: TypeEnv;
    /** Current substitution */
    subst: Substitution;
    /** Current level for type variable scoping */
    level: number;
};

/**
 * Inference result
 *
 * The result of type inference includes the inferred type and
 * the updated substitution.
 */
export type InferResult = {
    type: Type;
    subst: Substitution;
};

/**
 * Create a new inference context
 *
 * @param env - The type environment
 * @returns A new inference context
 */
export function createContext(env: TypeEnv): InferenceContext {
    return {
        env,
        subst: emptySubst(),
        level: 0,
    };
}

/**
 * Instantiate a type scheme by replacing quantified variables with fresh type variables
 *
 * @param scheme - The type scheme to instantiate
 * @param level - The current level for fresh type variables
 * @returns The instantiated type
 */
export function instantiate(scheme: TypeScheme, level: number): Type {
    // Create a mapping from quantified variable IDs to fresh type variables
    const mapping = new Map<number, Type>();
    for (const varId of scheme.vars) {
        mapping.set(varId, freshTypeVar(level));
    }

    // Replace quantified variables in the type
    return substituteTypeVars(scheme.type, mapping);
}

/**
 * Substitute type variables according to a mapping
 *
 * @param type - The type to substitute in
 * @param mapping - Map from variable IDs to replacement types
 * @returns The type with substitutions applied
 */
function substituteTypeVars(type: Type, mapping: Map<number, Type>): Type {
    switch (type.type) {
        case "Var": {
            const replacement = mapping.get(type.id);
            return replacement ?? type;
        }

        case "Const":
            return type;

        case "Fun":
            return {
                type: "Fun",
                params: type.params.map((p) => substituteTypeVars(p, mapping)),
                return: substituteTypeVars(type.return, mapping),
            };

        case "App":
            return {
                type: "App",
                constructor: substituteTypeVars(type.constructor, mapping),
                args: type.args.map((arg) => substituteTypeVars(arg, mapping)),
            };

        case "Record":
            return {
                type: "Record",
                fields: new Map(
                    Array.from(type.fields.entries()).map(([name, fieldType]) => [
                        name,
                        substituteTypeVars(fieldType, mapping),
                    ]),
                ),
            };

        case "Variant":
            return {
                type: "Variant",
                constructors: new Map(
                    Array.from(type.constructors.entries()).map(([name, types]) => [
                        name,
                        types.map((t) => substituteTypeVars(t, mapping)),
                    ]),
                ),
            };

        case "Union":
            return {
                type: "Union",
                types: type.types.map((t) => substituteTypeVars(t, mapping)),
            };
    }
}

/**
 * Infer the type of an expression
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
            return inferLambda(ctx, expr);

        // Applications
        case "CoreApp":
            return inferApp(ctx, expr);

        // Binary operations
        case "CoreBinOp":
            return inferBinOp(ctx, expr);

        // Unary operations
        case "CoreUnaryOp":
            return inferUnaryOp(ctx, expr);

        // Type annotations
        case "CoreTypeAnnotation":
            return inferTypeAnnotation(ctx, expr);

        // Other cases to be implemented in later phases
        case "CoreLet":
        case "CoreMatch":
        case "CoreRecord":
        case "CoreRecordAccess":
        case "CoreRecordUpdate":
        case "CoreVariant":
        case "CoreUnsafe":
            throw new TypeError(
                `Type inference for ${expr.kind} not yet implemented`,
                expr.loc,
                `This feature will be implemented in a later phase`,
            );
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
        // ExternalOverload case - not yet supported in Phase 3
        throw new TypeError(
            `Overloaded external '${name}' not yet supported`,
            loc,
            `Overload resolution will be implemented in Phase 7`,
        );
    }

    // Instantiate the type scheme
    const type = instantiate(scheme, ctx.level);

    return { type, subst: ctx.subst };
}

/**
 * Infer the type of a lambda abstraction
 *
 * Creates a fresh type variable for the parameter, infers the body type,
 * and returns a function type.
 *
 * @param ctx - The inference context
 * @param expr - The lambda expression
 * @returns The inferred type and updated substitution
 */
function inferLambda(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLambda" }>): InferResult {
    // Create fresh type variable for parameter
    const paramType = freshTypeVar(ctx.level);

    // Add parameter to environment
    // For simplicity, we only handle variable patterns in Phase 3
    if (expr.param.kind !== "CoreVarPattern") {
        throw new TypeError(
            `Pattern matching in lambda parameters not yet supported`,
            expr.loc,
            `Only simple variable patterns are supported in this phase`,
        );
    }

    const paramName = expr.param.name;
    const paramScheme: TypeScheme = { vars: [], type: paramType }; // Monomorphic

    const newEnv: TypeEnv = {
        values: new Map(ctx.env.values),
        types: ctx.env.types,
    };
    newEnv.values.set(paramName, {
        kind: "Value",
        scheme: paramScheme,
        loc: expr.param.loc,
    });

    // Infer body type
    const bodyCtx: InferenceContext = { env: newEnv, subst: ctx.subst, level: ctx.level };
    const bodyResult = inferExpr(bodyCtx, expr.body);

    // Apply substitution to parameter type
    const finalParamType = applySubst(bodyResult.subst, paramType);

    // Return function type
    const funcType = funType([finalParamType], bodyResult.type);

    return { type: funcType, subst: bodyResult.subst };
}

/**
 * Infer the type of a function application
 *
 * Infers the function and argument types, unifies the function type
 * with (arg -> result), and returns the result type.
 *
 * @param ctx - The inference context
 * @param expr - The application expression
 * @returns The inferred type and updated substitution
 */
function inferApp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreApp" }>): InferResult {
    // Infer function type
    const funcResult = inferExpr(ctx, expr.func);

    // Infer argument types
    let currentSubst = funcResult.subst;
    const argTypes: Type[] = [];

    for (const arg of expr.args) {
        const argCtx: InferenceContext = { ...ctx, subst: currentSubst };
        const argResult = inferExpr(argCtx, arg);
        argTypes.push(argResult.type);
        currentSubst = argResult.subst;
    }

    // Create fresh type variable for result
    const resultType = freshTypeVar(ctx.level);

    // Create expected function type: (arg1, arg2, ...) -> result
    const expectedFuncType = funType(argTypes, resultType);

    // Apply current substitution to function type
    const actualFuncType = applySubst(currentSubst, funcResult.type);

    // Unify function type with expected type
    try {
        const unifySubst = unify(actualFuncType, expectedFuncType);
        const finalSubst = composeSubst(unifySubst, currentSubst);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in function application`,
            expr.loc,
            `Expected function type, got ${typeToString(actualFuncType)}`,
        );
    }
}

/**
 * Infer the type of a binary operation
 *
 * @param ctx - The inference context
 * @param expr - The binary operation expression
 * @returns The inferred type and updated substitution
 */
function inferBinOp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreBinOp" }>): InferResult {
    // Infer left operand
    const leftResult = inferExpr(ctx, expr.left);

    // Infer right operand
    const rightCtx: InferenceContext = { ...ctx, subst: leftResult.subst };
    const rightResult = inferExpr(rightCtx, expr.right);

    const currentSubst = rightResult.subst;

    // Apply substitution to left type
    const leftType = applySubst(currentSubst, leftResult.type);
    const rightType = rightResult.type;

    // Determine expected types and result type based on operator
    const { paramType, resultType } = getBinOpTypes(expr.op);

    // Unify operand types with expected parameter type
    try {
        const leftUnify = unify(leftType, paramType);
        const subst1 = composeSubst(leftUnify, currentSubst);

        const rightTypeSubst = applySubst(subst1, rightType);
        const paramTypeSubst = applySubst(subst1, paramType);

        const rightUnify = unify(rightTypeSubst, paramTypeSubst);
        const finalSubst = composeSubst(rightUnify, subst1);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in binary operation ${expr.op}`,
            expr.loc,
            `Cannot apply ${expr.op} to types ${typeToString(leftType)} and ${typeToString(rightType)}`,
        );
    }
}

/**
 * Get the parameter and result types for a binary operator
 *
 * @param op - The binary operator
 * @returns The parameter type and result type
 */
function getBinOpTypes(op: CoreBinaryOp): { paramType: Type; resultType: Type } {
    switch (op) {
        // Arithmetic: (Int, Int) -> Int or (Float, Float) -> Float
        // For now, we'll use a fresh type variable that can unify with Int or Float
        case "Add":
        case "Subtract":
        case "Multiply":
        case "Divide":
        case "Modulo": {
            // For simplicity in Phase 3, require Int
            // TODO: Phase 7 will add polymorphic arithmetic
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Int,
            };
        }

        // Comparison: (Int, Int) -> Bool or (Float, Float) -> Bool
        case "LessThan":
        case "LessEqual":
        case "GreaterThan":
        case "GreaterEqual": {
            // For simplicity, require Int
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Bool,
            };
        }

        // Equality: (T, T) -> Bool (polymorphic)
        case "Equal":
        case "NotEqual": {
            const t = freshTypeVar(0);
            return {
                paramType: t,
                resultType: primitiveTypes.Bool,
            };
        }

        // Logical: (Bool, Bool) -> Bool
        case "LogicalAnd":
        case "LogicalOr":
            return {
                paramType: primitiveTypes.Bool,
                resultType: primitiveTypes.Bool,
            };

        // String concat: (String, String) -> String
        case "Concat":
            return {
                paramType: primitiveTypes.String,
                resultType: primitiveTypes.String,
            };

        // Reference assignment: (Ref<T>, T) -> Unit
        case "RefAssign": {
            // This will be properly implemented in Phase 2.5 completion
            // For now, throw an error
            throw new Error("RefAssign operator type checking not yet implemented");
        }
    }
}

/**
 * Infer the type of a unary operation
 *
 * @param ctx - The inference context
 * @param expr - The unary operation expression
 * @returns The inferred type and updated substitution
 */
function inferUnaryOp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreUnaryOp" }>): InferResult {
    // Infer operand type
    const operandResult = inferExpr(ctx, expr.expr);

    const { paramType, resultType } = getUnaryOpTypes(expr.op);

    // Unify operand type with expected parameter type
    try {
        const unifySubst = unify(operandResult.type, paramType);
        const finalSubst = composeSubst(unifySubst, operandResult.subst);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in unary operation ${expr.op}`,
            expr.expr.loc,
            `Cannot apply ${expr.op} to type ${typeToString(operandResult.type)}`,
        );
    }
}

/**
 * Get the parameter and result types for a unary operator
 *
 * @param op - The unary operator
 * @returns The parameter type and result type
 */
function getUnaryOpTypes(op: CoreUnary): { paramType: Type; resultType: Type } {
    switch (op) {
        // Negation: Int -> Int or Float -> Float
        case "Negate":
            // For simplicity, require Int
            return {
                paramType: primitiveTypes.Int,
                resultType: primitiveTypes.Int,
            };

        // Logical not: Bool -> Bool
        case "LogicalNot":
            return {
                paramType: primitiveTypes.Bool,
                resultType: primitiveTypes.Bool,
            };

        // Dereference: Ref<T> -> T
        case "Deref": {
            // This will be properly implemented in Phase 2.5 completion
            // For now, throw an error
            throw new Error("Deref operator type checking not yet implemented");
        }
    }
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
    // For Phase 3, we'll implement a simple converter
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
 * Convert a CoreTypeExpr to a Type
 *
 * This is a simple implementation for Phase 3. More complex type expressions
 * will be handled in later phases.
 *
 * @param typeExpr - The type expression to convert
 * @returns The corresponding Type
 */
function convertTypeExpr(typeExpr: CoreTypeExpr): Type {
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
        case "CoreRecordType":
        case "CoreVariantType":
        case "CoreUnionType":
            throw new Error(`Type expression ${typeExpr.kind} conversion not yet implemented`);
    }
}
