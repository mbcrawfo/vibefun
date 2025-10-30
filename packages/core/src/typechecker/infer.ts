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
import { checkExhaustiveness, checkPattern } from "./patterns.js";
import {
    appType,
    constType,
    freeTypeVarsAtLevel,
    freshTypeVar,
    funType,
    isSyntacticValue,
    primitiveTypes,
    typeToString,
} from "./types.js";
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

        // Let bindings
        case "CoreLet":
            return inferLet(ctx, expr);

        case "CoreLetRecExpr":
            return inferLetRecExpr(ctx, expr);

        // Records
        case "CoreRecord":
            return inferRecord(ctx, expr);

        case "CoreRecordAccess":
            return inferRecordAccess(ctx, expr);

        case "CoreRecordUpdate":
            return inferRecordUpdate(ctx, expr);

        // Variants
        case "CoreVariant":
            return inferVariant(ctx, expr);

        // Unsafe blocks
        case "CoreUnsafe":
            return inferUnsafe(ctx, expr);

        // Not yet implemented
        case "CoreMatch":
            return inferMatch(ctx, expr);
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

    // Special handling for RefAssign: (Ref<T>, T) -> Unit
    if (expr.op === "RefAssign") {
        try {
            // Left operand must be Ref<T>
            const elemType = freshTypeVar(ctx.level);
            const refType = appType(constType("Ref"), [elemType]);

            // Unify left with Ref<T>
            const leftUnify = unify(leftType, refType);
            const subst1 = composeSubst(leftUnify, currentSubst);

            // Apply substitution to get the actual element type
            const actualElemType = applySubst(subst1, elemType);
            const rightTypeSubst = applySubst(subst1, rightType);

            // Unify right with T
            const rightUnify = unify(rightTypeSubst, actualElemType);
            const finalSubst = composeSubst(rightUnify, subst1);

            // Result is Unit
            return { type: primitiveTypes.Unit, subst: finalSubst };
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type error in reference assignment`,
                expr.loc,
                `Expected (Ref<T>, T) -> Unit, but got ${typeToString(leftType)} := ${typeToString(rightType)}`,
            );
        }
    }

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

    // Special handling for Deref: Ref<T> -> T
    if (expr.op === "Deref") {
        try {
            // Operand must be Ref<T>
            const elemType = freshTypeVar(ctx.level);
            const refType = appType(constType("Ref"), [elemType]);

            // Unify operand with Ref<T>
            const unifySubst = unify(operandResult.type, refType);
            const finalSubst = composeSubst(unifySubst, operandResult.subst);

            // Apply substitution to get the actual element type
            const resultType = applySubst(finalSubst, elemType);

            return { type: resultType, subst: finalSubst };
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type error in dereference`,
                expr.expr.loc,
                `Expected Ref<T>, but got ${typeToString(operandResult.type)}`,
            );
        }
    }

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
 * Generalize a type to a type scheme
 *
 * Quantifies over all type variables at the current level, respecting
 * the value restriction for sound polymorphism with mutable references.
 *
 * @param ctx - The inference context
 * @param type - The type to generalize
 * @param expr - The expression being generalized (for value restriction)
 * @returns A type scheme with quantified variables
 */
function generalize(ctx: InferenceContext, type: Type, expr: CoreExpr): TypeScheme {
    // Apply current substitution to the type
    const finalType = applySubst(ctx.subst, type);

    // Find all free type variables at the current level
    const freeVarsSet = freeTypeVarsAtLevel(finalType, ctx.level);
    const freeVars = Array.from(freeVarsSet);

    // Value restriction: only generalize if the expression is a syntactic value
    // This prevents unsound generalization of mutable references
    // For example: let x = ref None should have type Ref<'a option>, not ∀'a. Ref<'a option>
    if (isSyntacticValue(expr)) {
        return { vars: freeVars, type: finalType };
    } else {
        // Not a syntactic value - don't generalize (monomorphic)
        return { vars: [], type: finalType };
    }
}

/**
 * Infer the type of a let-binding
 *
 * Handles let-polymorphism with generalization, supporting both
 * recursive and non-recursive bindings.
 *
 * @param ctx - The inference context
 * @param expr - The let expression
 * @returns The inferred type and updated substitution
 */
function inferLet(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLet" }>): InferResult {
    // For simplicity, we only handle variable patterns in Phase 4
    if (expr.pattern.kind !== "CoreVarPattern") {
        throw new TypeError(
            `Pattern matching in let-bindings not yet supported`,
            expr.loc,
            `Only simple variable patterns are supported in this phase`,
        );
    }

    const varName = expr.pattern.name;

    // Mutable bindings are not supported yet (Phase 2.5 completion)
    if (expr.mutable) {
        throw new TypeError(
            `Mutable let-bindings not yet supported`,
            expr.loc,
            `Mutable bindings will be fully supported after Phase 2.5 completion`,
        );
    }

    // Create new context with increased level for generalization
    const newLevel = ctx.level + 1;
    let valueCtx: InferenceContext = { ...ctx, level: newLevel };

    // Track temp type for recursive bindings
    let tempType: Type | null = null;

    // Handle recursive bindings
    if (expr.recursive) {
        // For recursive bindings, add a temporary binding with a fresh type variable
        tempType = freshTypeVar(newLevel);
        const tempScheme: TypeScheme = { vars: [], type: tempType };

        const newEnv: TypeEnv = {
            types: ctx.env.types,
            values: new Map(ctx.env.values),
        };
        newEnv.values.set(varName, {
            kind: "Value",
            scheme: tempScheme,
            loc: expr.loc,
        });

        valueCtx = { ...valueCtx, env: newEnv };
    }

    // Infer the type of the value
    const valueResult = inferExpr(valueCtx, expr.value);
    valueCtx = { ...valueCtx, subst: valueResult.subst };

    // For recursive bindings, unify the inferred type with the temporary type variable
    if (expr.recursive && tempType) {
        try {
            const tempTypeSubst = applySubst(valueResult.subst, tempType);
            const unifySubst = unify(tempTypeSubst, valueResult.type);
            valueCtx.subst = composeSubst(unifySubst, valueResult.subst);
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type mismatch in recursive binding`,
                expr.loc,
                `The type of '${varName}' is inconsistent with its usage`,
            );
        }
    }

    // Generalize the type of the value
    const valueScheme = generalize(valueCtx, valueResult.type, expr.value);

    // Add the binding to the environment
    const newEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };
    newEnv.values.set(varName, {
        kind: "Value",
        scheme: valueScheme,
        loc: expr.loc,
    });

    // Infer the type of the body with the updated environment
    const bodyCtx: InferenceContext = {
        env: newEnv,
        subst: valueCtx.subst,
        level: ctx.level, // Back to the original level
    };

    return inferExpr(bodyCtx, expr.body);
}

/**
 * Infer the type of mutually recursive let bindings (let rec f = ... and g = ... in body)
 *
 * Implements the algorithm for mutually recursive bindings:
 * 1. Bind all names with fresh type variables BEFORE inferring any values
 * 2. Increment level
 * 3. Infer each value expression
 * 4. Unify inferred types with placeholder types
 * 5. Generalize all bindings together
 * 6. Add all bindings to environment
 * 7. Infer the body expression
 *
 * @param ctx - The inference context
 * @param expr - The mutually recursive let expression
 * @returns The inferred type and updated substitution
 * @throws {TypeError} If type inference fails
 */
function inferLetRecExpr(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLetRecExpr" }>): InferResult {
    // For simplicity, only handle variable patterns
    for (const binding of expr.bindings) {
        if (binding.pattern.kind !== "CoreVarPattern") {
            throw new TypeError(
                `Pattern matching in mutually recursive bindings not yet supported`,
                binding.loc,
                `Only simple variable patterns are supported in mutually recursive bindings`,
            );
        }
    }

    // Mutable bindings are not supported yet
    for (const binding of expr.bindings) {
        if (binding.mutable) {
            throw new TypeError(
                `Mutable bindings in mutually recursive groups not yet supported`,
                binding.loc,
                `Mutable bindings will be fully supported after Phase 2.5 completion`,
            );
        }
    }

    // Step 1: Create new level for generalization
    const newLevel = ctx.level + 1;

    // Step 2: Bind all names with fresh type variables BEFORE inferring any values
    const tempTypes: Map<string, Type> = new Map();
    const newEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const tempType = freshTypeVar(newLevel);
        tempTypes.set(varName, tempType);

        // Add temporary binding to environment
        newEnv.values.set(varName, {
            kind: "Value",
            scheme: { vars: [], type: tempType },
            loc: binding.loc,
        });
    }

    // Step 3: Infer each value expression with all names bound
    let currentSubst = ctx.subst;
    const inferredTypes: Map<string, Type> = new Map();

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;

        const valueCtx: InferenceContext = {
            env: newEnv,
            subst: currentSubst,
            level: newLevel,
        };

        const valueResult = inferExpr(valueCtx, binding.value);
        currentSubst = valueResult.subst;
        inferredTypes.set(varName, valueResult.type);
    }

    // Step 4: Unify inferred types with placeholder types
    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const tempType = tempTypes.get(varName);
        const inferredType = inferredTypes.get(varName);

        if (!tempType || !inferredType) {
            throw new TypeError(
                `Internal error: missing type for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        try {
            const tempTypeSubst = applySubst(currentSubst, tempType);
            const unifySubst = unify(tempTypeSubst, inferredType);
            currentSubst = composeSubst(unifySubst, currentSubst);
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type mismatch in mutually recursive binding`,
                binding.loc,
                `The type of '${varName}' is inconsistent with its usage`,
            );
        }
    }

    // Step 5: Generalize all bindings together
    const generalizedSchemes: Map<string, TypeScheme> = new Map();
    const valueCtxForGeneralize: InferenceContext = {
        env: newEnv,
        subst: currentSubst,
        level: newLevel,
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const inferredType = inferredTypes.get(varName);

        if (!inferredType) {
            throw new TypeError(
                `Internal error: missing inferred type for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        const scheme = generalize(valueCtxForGeneralize, inferredType, binding.value);
        generalizedSchemes.set(varName, scheme);
    }

    // Step 6: Add all bindings to environment with generalized types
    const finalEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const scheme = generalizedSchemes.get(varName);

        if (!scheme) {
            throw new TypeError(
                `Internal error: missing scheme for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        finalEnv.values.set(varName, {
            kind: "Value",
            scheme,
            loc: binding.loc,
        });
    }

    // Step 7: Infer the body expression with the updated environment
    const bodyCtx: InferenceContext = {
        env: finalEnv,
        subst: currentSubst,
        level: ctx.level, // Back to the original level
    };

    return inferExpr(bodyCtx, expr.body);
}

/**
 * Infer the type of a record construction
 *
 * Creates a record type with the types of all fields.
 *
 * @param ctx - The inference context
 * @param expr - The record construction expression
 * @returns The inferred type and updated substitution
 */
function inferRecord(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreRecord" }>): InferResult {
    let currentCtx = ctx;
    const fieldTypes = new Map<string, Type>();

    // Infer the type of each field
    for (const field of expr.fields) {
        const fieldResult = inferExpr(currentCtx, field.value);
        currentCtx = { ...currentCtx, subst: fieldResult.subst };
        fieldTypes.set(field.name, fieldResult.type);
    }

    // Create the record type
    const recordType: Type = {
        type: "Record",
        fields: fieldTypes,
    };

    return { type: recordType, subst: currentCtx.subst };
}

/**
 * Infer the type of a record field access
 *
 * Checks that the record has the requested field and returns its type.
 *
 * @param ctx - The inference context
 * @param expr - The record access expression
 * @returns The inferred type and updated substitution
 */
function inferRecordAccess(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreRecordAccess" }>): InferResult {
    // Infer the type of the record expression
    const recordResult = inferExpr(ctx, expr.record);
    const recordType = applySubst(recordResult.subst, recordResult.type);

    // Check that it's a record type
    if (recordType.type !== "Record") {
        throw new TypeError(
            `Cannot access field '${expr.field}' on non-record type`,
            expr.loc,
            `Expected a record type, but got ${typeToString(recordType)}`,
        );
    }

    // Look up the field
    const fieldType = recordType.fields.get(expr.field);
    if (!fieldType) {
        const availableFields = Array.from(recordType.fields.keys()).join(", ");
        throw new TypeError(
            `Record does not have field '${expr.field}'`,
            expr.loc,
            `Available fields: ${availableFields || "(none)"}`,
        );
    }

    return { type: fieldType, subst: recordResult.subst };
}

/**
 * Infer the type of a record update
 *
 * Creates a new record type with updated fields.
 *
 * @param ctx - The inference context
 * @param expr - The record update expression
 * @returns The inferred type and updated substitution
 */
function inferRecordUpdate(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreRecordUpdate" }>): InferResult {
    // Infer the type of the base record
    const recordResult = inferExpr(ctx, expr.record);
    let currentCtx: InferenceContext = { ...ctx, subst: recordResult.subst };
    const recordType = applySubst(recordResult.subst, recordResult.type);

    // Check that it's a record type
    if (recordType.type !== "Record") {
        throw new TypeError(
            `Cannot update fields on non-record type`,
            expr.loc,
            `Expected a record type, but got ${typeToString(recordType)}`,
        );
    }

    // Create a new field map with updates
    const newFields = new Map(recordType.fields);

    // Infer and check each update
    for (const update of expr.updates) {
        // Check that the field exists in the original record
        if (!recordType.fields.has(update.name)) {
            const availableFields = Array.from(recordType.fields.keys()).join(", ");
            throw new TypeError(
                `Cannot update non-existent field '${update.name}'`,
                update.loc,
                `Available fields: ${availableFields || "(none)"}`,
            );
        }

        // Infer the type of the update value
        const updateResult = inferExpr(currentCtx, update.value);
        currentCtx = { ...currentCtx, subst: updateResult.subst };

        // Get the expected field type (after applying current substitution)
        const originalFieldType = recordType.fields.get(update.name);
        if (!originalFieldType) {
            throw new Error(`Field ${update.name} unexpectedly missing from record type`);
        }
        const expectedType = applySubst(currentCtx.subst, originalFieldType);
        const actualType = updateResult.type;

        // Unify the update value type with the field type
        try {
            const unifySubst = unify(actualType, expectedType);
            currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type mismatch in record update for field '${update.name}'`,
                update.loc,
                `Expected ${typeToString(expectedType)}, but got ${typeToString(actualType)}`,
            );
        }

        // Update the field in the new map
        newFields.set(update.name, applySubst(currentCtx.subst, actualType));
    }

    // Create the updated record type
    const updatedRecordType: Type = {
        type: "Record",
        fields: newFields,
    };

    return { type: updatedRecordType, subst: currentCtx.subst };
}

/**
 * Infer the type of a variant construction
 *
 * Looks up the constructor in the environment, instantiates its type,
 * and checks the arguments.
 *
 * @param ctx - The inference context
 * @param expr - The variant construction expression
 * @returns The inferred type and updated substitution
 */
function inferVariant(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreVariant" }>): InferResult {
    // Look up the constructor in the environment
    const binding = ctx.env.values.get(expr.constructor);

    if (!binding) {
        throw new TypeError(
            `Undefined variant constructor '${expr.constructor}'`,
            expr.loc,
            `Constructor '${expr.constructor}' is not in scope`,
        );
    }

    // Get the constructor's type scheme
    let scheme: TypeScheme;
    if (binding.kind === "Value" || binding.kind === "External") {
        scheme = binding.scheme;
    } else {
        throw new TypeError(
            `Overloaded external '${expr.constructor}' not supported as variant constructor`,
            expr.loc,
            `Variant constructors cannot be overloaded`,
        );
    }

    // Instantiate the type scheme
    const constructorType = instantiate(scheme, ctx.level);

    // Check if constructor is a function type (expects arguments)
    if (constructorType.type === "Fun") {
        // Constructor expects arguments

        // Check that the number of arguments matches
        if (expr.args.length !== constructorType.params.length) {
            throw new TypeError(
                `Constructor '${expr.constructor}' expects ${constructorType.params.length} arguments, but got ${expr.args.length}`,
                expr.loc,
                `Argument count mismatch`,
            );
        }
    } else {
        // Constructor takes no arguments (e.g., None, Nil)

        // Check that we're not trying to pass arguments
        if (expr.args.length > 0) {
            throw new TypeError(
                `Constructor '${expr.constructor}' expects no arguments, but got ${expr.args.length}`,
                expr.loc,
                `Cannot apply arguments to nullary constructor`,
            );
        }

        // Return the constructor type directly
        return { type: constructorType, subst: ctx.subst };
    }

    // Infer the type of each argument and unify with the expected parameter type
    let currentCtx: InferenceContext = ctx;
    for (let i = 0; i < expr.args.length; i++) {
        const arg = expr.args[i];
        const expectedType = constructorType.params[i];

        if (!arg || !expectedType) {
            throw new Error(`Missing argument or parameter at index ${i}`);
        }

        // Infer argument type
        const argResult = inferExpr(currentCtx, arg);
        currentCtx = { ...currentCtx, subst: argResult.subst };

        // Apply current substitution to expected type
        const expectedTypeSubst = applySubst(currentCtx.subst, expectedType);

        // Unify argument type with expected type
        try {
            const unifySubst = unify(argResult.type, expectedTypeSubst);
            currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);
        } catch (error) {
            if (error instanceof TypeError) {
                throw error;
            }
            throw new TypeError(
                `Type mismatch in argument ${i + 1} to constructor '${expr.constructor}'`,
                arg.loc,
                `Expected ${typeToString(expectedTypeSubst)}, but got ${typeToString(argResult.type)}`,
            );
        }
    }

    // Return the constructor's return type
    const resultType = applySubst(currentCtx.subst, constructorType.return);
    return { type: resultType, subst: currentCtx.subst };
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
 * Infer the type of a match expression
 *
 * Steps:
 * 1. Infer the type of the scrutinee (matched expression)
 * 2. For each case:
 *    a. Check the pattern against scrutinee type
 *    b. Extend environment with pattern bindings
 *    c. Infer the body type
 * 3. Check exhaustiveness
 * 4. Unify all case body types
 * 5. Return unified result type
 */
function inferMatch(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreMatch" }>): InferResult {
    // Infer scrutinee type
    const scrutineeResult = inferExpr(ctx, expr.expr);
    let currentCtx: InferenceContext = { ...ctx, subst: scrutineeResult.subst };
    const scrutineeType = applySubst(currentCtx.subst, scrutineeResult.type);

    // Check exhaustiveness
    const patterns = expr.cases.map((c) => c.pattern);
    const missingCases = checkExhaustiveness(currentCtx.env, patterns, scrutineeType);
    if (missingCases.length > 0) {
        throw new TypeError(`Non-exhaustive pattern match`, expr.loc, `Missing cases: ${missingCases.join(", ")}`);
    }

    // Infer type of each case
    let resultType: Type | null = null;

    for (const matchCase of expr.cases) {
        // Check pattern against scrutinee type
        const patternResult = checkPattern(
            currentCtx.env,
            matchCase.pattern,
            scrutineeType,
            currentCtx.subst,
            currentCtx.level,
        );
        currentCtx = { ...currentCtx, subst: patternResult.subst };

        // Extend environment with pattern bindings
        const caseEnv: TypeEnv = {
            values: new Map(currentCtx.env.values),
            types: currentCtx.env.types,
        };

        for (const [name, type] of patternResult.bindings) {
            caseEnv.values.set(name, {
                kind: "Value",
                scheme: { vars: [], type },
                loc: matchCase.loc,
            });
        }

        // If there's a guard, check it and ensure it's Bool
        if (matchCase.guard) {
            const guardCtx: InferenceContext = {
                ...currentCtx,
                env: caseEnv,
            };
            const guardResult = inferExpr(guardCtx, matchCase.guard);
            currentCtx = { ...currentCtx, subst: guardResult.subst };

            // Unify guard type with Bool
            const guardUnifySubst = unify(applySubst(guardResult.subst, guardResult.type), primitiveTypes.Bool);
            currentCtx.subst = composeSubst(guardUnifySubst, currentCtx.subst);
        }

        // Infer body type with extended environment
        const bodyCtx: InferenceContext = {
            ...currentCtx,
            env: caseEnv,
        };
        const bodyResult = inferExpr(bodyCtx, matchCase.body);
        currentCtx = { ...currentCtx, subst: bodyResult.subst };

        // Unify with result type (first case sets it, others must match)
        if (resultType === null) {
            resultType = bodyResult.type;
        } else {
            const unifySubst = unify(
                applySubst(currentCtx.subst, resultType),
                applySubst(currentCtx.subst, bodyResult.type),
            );
            currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);
            resultType = applySubst(currentCtx.subst, resultType);
        }
    }

    // Return unified result type
    if (resultType === null) {
        throw new TypeError(`Match expression has no cases`, expr.loc, `Add at least one match case`);
    }

    return {
        type: applySubst(currentCtx.subst, resultType),
        subst: currentCtx.subst,
    };
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
    }
}
