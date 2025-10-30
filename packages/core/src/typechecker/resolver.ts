/**
 * Overload resolution for external functions
 *
 * This module implements the algorithm for resolving which overload
 * of an external function to use based on call-site argument types.
 */

import type { Expr, TypeExpr } from "../types/ast.js";
import type { ExternalOverload, TypeEnv, ValueBinding } from "../types/environment.js";

import { TypeError } from "../utils/error.js";

/**
 * Result of overload resolution
 */
export type ResolutionResult =
    | {
          kind: "Single";
          /** The single binding (not overloaded) */
          binding: ValueBinding & ({ kind: "Value" } | { kind: "External" });
      }
    | {
          kind: "Overload";
          /** The selected overload */
          overload: ExternalOverload;
          /** Index of the selected overload (for debugging) */
          index: number;
          /** The JavaScript name to call */
          jsName: string;
          /** Optional module import path */
          from?: string;
      };

/**
 * Resolve which function/overload to use for a function call
 *
 * This function implements the overload resolution algorithm:
 * 1. Look up the function name in the environment
 * 2. If not found → error
 * 3. If single binding (not overloaded) → return it
 * 4. If overloaded → resolve based on arguments:
 *    a. Filter by arity (argument count)
 *    b. Filter by type compatibility (when types are available)
 *    c. Select most specific match
 *    d. If ambiguous or no match → error
 *
 * @param env - The type environment
 * @param name - The function name being called
 * @param args - The argument expressions at the call site
 * @param callLoc - Location of the function call (for error reporting)
 * @returns The resolution result
 * @throws {TypeError} If resolution fails
 */
export function resolveCall(
    env: TypeEnv,
    name: string,
    args: Expr[],
    callLoc: { line: number; column: number; file: string; offset: number },
): ResolutionResult {
    // Look up the name in the environment
    const binding = env.values.get(name);

    if (!binding) {
        throw new TypeError(
            `Undefined function '${name}'`,
            callLoc,
            `The function '${name}' is not defined in this scope.`,
        );
    }

    // If not overloaded, return the single binding
    if (binding.kind === "Value" || binding.kind === "External") {
        return {
            kind: "Single",
            binding,
        };
    }

    // Overloaded external - resolve which overload to use
    return resolveOverload(name, binding, args, callLoc);
}

/**
 * Resolve which overload to use for an overloaded external function
 *
 * Resolution strategy:
 * 1. Filter by arity (number of parameters must match number of arguments)
 * 2. Filter by type compatibility (when type information is available)
 * 3. If exactly one candidate remains → success
 * 4. If zero candidates → error (no matching signature)
 * 5. If multiple candidates → error (ambiguous call)
 *
 * @param name - Function name (for error messages)
 * @param binding - The overloaded external binding
 * @param args - Argument expressions
 * @param callLoc - Call site location
 * @returns Resolution result with selected overload
 * @throws {TypeError} If resolution fails
 */
function resolveOverload(
    name: string,
    binding: ValueBinding & { kind: "ExternalOverload" },
    args: Expr[],
    callLoc: { line: number; column: number; file: string; offset: number },
): ResolutionResult {
    const { overloads, jsName, from } = binding;
    const argCount = args.length;

    // Step 1: Filter by arity (argument count)
    const arityCandidates = overloads
        .map((overload, index) => ({ overload, index }))
        .filter(({ overload }) => overload.paramTypes.length === argCount);

    if (arityCandidates.length === 0) {
        // No overload matches the argument count
        const arities = overloads.map((o) => o.paramTypes.length);
        const uniqueArities = Array.from(new Set(arities)).sort((a, b) => a - b);
        const expectedArity =
            uniqueArities.length === 1
                ? `${uniqueArities[0]}`
                : uniqueArities.length === 2
                  ? `${uniqueArities[0]} or ${uniqueArities[1]}`
                  : `one of ${uniqueArities.join(", ")}`;

        throw new TypeError(
            `No matching signature for '${name}'`,
            callLoc,
            `Expected ${expectedArity} argument${expectedArity === "1" ? "" : "s"}, but got ${argCount}.\n` +
                `Available signatures:\n${formatOverloads(overloads)}`,
        );
    }

    // Step 2: Filter by type compatibility
    // TODO: When full type inference is implemented, add type-based filtering here
    // For now, we skip this step since we don't have type information for arguments

    const candidates = arityCandidates;

    if (candidates.length === 1) {
        // Exactly one match - success!
        const selected = candidates[0];
        if (!selected) {
            // Should never happen given the length check, but TypeScript doesn't know that
            throw new TypeError(
                `Internal error resolving call to '${name}'`,
                callLoc,
                `Expected a candidate but found none.`,
            );
        }
        return {
            kind: "Overload",
            overload: selected.overload,
            index: selected.index,
            jsName,
            ...(from !== undefined && { from }),
        };
    }

    // Multiple candidates remain - ambiguous call
    // This can happen when:
    // - We don't have type information yet (no inference implemented)
    // - Multiple overloads have the same arity but different types
    const candidateSignatures = candidates.map((c) => formatOverload(c.overload)).join("\n  ");

    throw new TypeError(
        `Ambiguous call to '${name}'`,
        callLoc,
        `Multiple signatures match the argument count:\n  ${candidateSignatures}\n` +
            `Add explicit type annotations to the arguments to disambiguate.`,
    );
}

/**
 * Format an overload for display in error messages
 *
 * @param overload - The overload to format
 * @returns A human-readable signature string
 */
function formatOverload(overload: ExternalOverload): string {
    const params = overload.paramTypes.map((p) => formatType(p)).join(", ");
    const returnType = formatType(overload.returnType);
    return `(${params}) -> ${returnType}`;
}

/**
 * Format multiple overloads for display in error messages
 *
 * @param overloads - The overloads to format
 * @returns A human-readable list of signatures
 */
function formatOverloads(overloads: ExternalOverload[]): string {
    return overloads.map((o, i) => `  ${i + 1}. ${formatOverload(o)}`).join("\n");
}

/**
 * Format a type expression for display
 *
 * This is a simplified formatter for error messages.
 * TODO: Improve formatting when full type checker is implemented.
 *
 * @param typeExpr - The type expression to format
 * @returns A human-readable type string
 */
function formatType(typeExpr: TypeExpr): string {
    switch (typeExpr.kind) {
        case "TypeVar":
            return typeExpr.name;
        case "TypeConst":
            return typeExpr.name;
        case "FunctionType": {
            const params = typeExpr.params.map((p) => formatType(p)).join(", ");
            const returnType = formatType(typeExpr.return_);
            return `(${params}) -> ${returnType}`;
        }
        case "TypeApp": {
            const constructor = formatType(typeExpr.constructor);
            const args = typeExpr.args.map((a) => formatType(a)).join(", ");
            return `${constructor}<${args}>`;
        }
        case "RecordType": {
            const fields = typeExpr.fields.map((f) => `${f.name}: ${formatType(f.typeExpr)}`).join(", ");
            return `{ ${fields} }`;
        }
        case "VariantType": {
            const constructors = typeExpr.constructors
                .map((c) => {
                    if (c.args.length === 0) {
                        return c.name;
                    }
                    const args = c.args.map((a) => formatType(a)).join(", ");
                    return `${c.name}(${args})`;
                })
                .join(" | ");
            return constructors;
        }
        case "UnionType": {
            return typeExpr.types.map((t) => formatType(t)).join(" | ");
        }
    }
}

/**
 * Check if a function is overloaded in the environment
 *
 * @param env - The type environment
 * @param name - The function name to check
 * @returns True if the function is overloaded
 */
export function isOverloaded(env: TypeEnv, name: string): boolean {
    const binding = env.values.get(name);
    return binding?.kind === "ExternalOverload";
}

/**
 * Get all overloads for a function
 *
 * @param env - The type environment
 * @param name - The function name
 * @returns The overloads if the function is overloaded, undefined otherwise
 */
export function getOverloads(env: TypeEnv, name: string): ExternalOverload[] | undefined {
    const binding = env.values.get(name);
    if (binding?.kind === "ExternalOverload") {
        return binding.overloads;
    }
    return undefined;
}
