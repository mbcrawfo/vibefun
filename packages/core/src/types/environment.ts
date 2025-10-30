/**
 * Type environment structures for type checking
 *
 * This module defines the type environment used during type checking,
 * including support for external function overloading.
 */

import type { Location, TypeExpr } from "./ast.js";

/**
 * Type environment mapping names to bindings
 */
export type TypeEnv = {
    /** Value bindings (functions, variables, externals) */
    values: Map<string, ValueBinding>;
    /** Type bindings (type definitions, external types) */
    types: Map<string, TypeBinding>;
};

/**
 * Value binding in the type environment
 */
export type ValueBinding =
    | {
          kind: "Value";
          /** Type scheme for the value (with quantified variables) */
          scheme: TypeScheme;
          /** Source location for error reporting */
          loc: Location;
      }
    | {
          kind: "External";
          /** Type scheme for the external function */
          scheme: TypeScheme;
          /** JavaScript name this external maps to */
          jsName: string;
          /** Optional module import path */
          from?: string;
          /** Source location for error reporting */
          loc: Location;
      }
    | {
          kind: "ExternalOverload";
          /** All overload cases for this name */
          overloads: ExternalOverload[];
          /** JavaScript name all overloads map to (must be the same) */
          jsName: string;
          /** Optional module import path (must be the same for all overloads) */
          from?: string;
          /** Source location for error reporting (first declaration) */
          loc: Location;
      };

/**
 * A single overload case for an external function
 */
export type ExternalOverload = {
    /** Parameter types (in order) */
    paramTypes: TypeExpr[];
    /** Return type */
    returnType: TypeExpr;
    /** Source location for error reporting */
    loc: Location;
};

/**
 * Type scheme with quantified type variables
 *
 * In Hindley-Milner type inference, a type scheme represents a polymorphic type
 * with universally quantified type variables.
 *
 * Example: forall a. (a) -> a
 */
export type TypeScheme = {
    /** Quantified type variable IDs */
    vars: number[];
    /** The type with free type variables */
    type: Type;
};

/**
 * Types used during type checking
 *
 * Note: This is separate from TypeExpr (AST-level types).
 * During type checking, we work with these internal types that support
 * unification and inference.
 */
export type Type =
    | { type: "Var"; id: number; level: number } // Type variable (for inference with scoping)
    | { type: "Const"; name: string } // Type constant (Int, String, etc.)
    | { type: "Fun"; params: Type[]; return: Type } // Function type
    | { type: "App"; constructor: Type; args: Type[] } // Type application (List<Int>)
    | { type: "Record"; fields: Map<string, Type> } // Record type
    | { type: "Variant"; constructors: Map<string, Type[]> } // Variant type
    | { type: "Union"; types: Type[] }; // Union type

/**
 * Type binding in the type environment
 */
export type TypeBinding =
    | {
          kind: "Alias";
          /** Type parameters (if generic) */
          params: string[];
          /** The type this aliases */
          definition: Type;
          /** Source location */
          loc: Location;
      }
    | {
          kind: "Record";
          /** Type parameters (if generic) */
          params: string[];
          /** Record fields */
          fields: Map<string, Type>;
          /** Source location */
          loc: Location;
      }
    | {
          kind: "Variant";
          /** Type parameters (if generic) */
          params: string[];
          /** Variant constructors and their argument types */
          constructors: Map<string, Type[]>;
          /** Source location */
          loc: Location;
      }
    | {
          kind: "External";
          /** The underlying type (usually opaque) */
          definition: Type;
          /** Source location */
          loc: Location;
      };

/**
 * Create an empty type environment
 */
export function emptyEnv(): TypeEnv {
    return {
        values: new Map(),
        types: new Map(),
    };
}

/**
 * Look up a value in the environment
 *
 * @param env - The type environment
 * @param name - The name to look up
 * @returns The value binding if found, undefined otherwise
 */
export function lookupValue(env: TypeEnv, name: string): ValueBinding | undefined {
    return env.values.get(name);
}

/**
 * Look up a type in the environment
 *
 * @param env - The type environment
 * @param name - The type name to look up
 * @returns The type binding if found, undefined otherwise
 */
export function lookupType(env: TypeEnv, name: string): TypeBinding | undefined {
    return env.types.get(name);
}

/**
 * Add a value binding to the environment
 *
 * @param env - The type environment to modify
 * @param name - The name to bind
 * @param binding - The value binding
 */
export function addValue(env: TypeEnv, name: string, binding: ValueBinding): void {
    env.values.set(name, binding);
}

/**
 * Add a type binding to the environment
 *
 * @param env - The type environment to modify
 * @param name - The type name to bind
 * @param binding - The type binding
 */
export function addType(env: TypeEnv, name: string, binding: TypeBinding): void {
    env.types.set(name, binding);
}

/**
 * Check if a value binding represents an overloaded external
 *
 * @param binding - The value binding to check
 * @returns True if the binding is an overloaded external
 */
export function isOverloaded(binding: ValueBinding): binding is ValueBinding & { kind: "ExternalOverload" } {
    return binding.kind === "ExternalOverload";
}

/**
 * Check if a value binding represents any kind of external (single or overloaded)
 *
 * @param binding - The value binding to check
 * @returns True if the binding is an external
 */
export function isExternal(
    binding: ValueBinding,
): binding is (ValueBinding & { kind: "External" }) | (ValueBinding & { kind: "ExternalOverload" }) {
    return binding.kind === "External" || binding.kind === "ExternalOverload";
}
