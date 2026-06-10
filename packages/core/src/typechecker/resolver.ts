/**
 * Overload resolution for external functions
 *
 * This module implements the algorithm for resolving which overload
 * of an external function to use based on the call-site argument count.
 *
 * Overload groups are built from post-desugar `CoreExternalDecl` nodes
 * (see environment.ts), so signatures are Core type expressions. Because
 * the desugarer curries every application into single-argument `CoreApp`
 * chains, the call-site argument count is the length of the application
 * spine whose head references the overloaded external.
 */

import type { CoreTypeExpr } from "../types/core-ast.js";
import type { ExternalOverload, TypeEnv, ValueBinding } from "../types/environment.js";

import { throwDiagnostic } from "../diagnostics/index.js";

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
 * 4. If overloaded → resolve based on argument count (arity)
 *
 * @param env - The type environment
 * @param name - The function name being called
 * @param argCount - The number of arguments at the call site
 * @param callLoc - Location of the function call (for error reporting)
 * @returns The resolution result
 * @throws {VibefunDiagnostic} If resolution fails
 */
export function resolveCall(
    env: TypeEnv,
    name: string,
    argCount: number,
    callLoc: { line: number; column: number; file: string; offset: number },
): ResolutionResult {
    // Look up the name in the environment
    const binding = env.values.get(name);

    if (!binding) {
        throwDiagnostic("VF4100", callLoc, { name });
    }

    // If not overloaded, return the single binding
    if (binding.kind === "Value" || binding.kind === "External") {
        return {
            kind: "Single",
            binding,
        };
    }

    // Overloaded external - resolve which overload to use
    return resolveOverload(name, binding, argCount, callLoc);
}

/**
 * Resolve which overload to use for an overloaded external function
 *
 * Resolution strategy (external-declarations.md "Overloads are resolved by
 * argument count"):
 * 1. Filter by arity — the overload's parameter count must equal the
 *    call-site argument count exactly. Partial application of a larger
 *    overload requires eta-expansion (`(x) => f(x, y)`), per the spec.
 * 2. If exactly one candidate remains → success
 * 3. If zero candidates → error (no matching signature)
 * 4. If multiple candidates → error (ambiguous call)
 *
 * @param name - Function name (for error messages)
 * @param binding - The overloaded external binding
 * @param argCount - The number of arguments at the call site
 * @param callLoc - Call site location
 * @returns Resolution result with selected overload
 * @throws {VibefunDiagnostic} If resolution fails
 */
export function resolveOverload(
    name: string,
    binding: ValueBinding & { kind: "ExternalOverload" },
    argCount: number,
    callLoc: { line: number; column: number; file: string; offset: number },
): ResolutionResult {
    const { overloads, jsName, from } = binding;

    // Step 1: Filter by arity (argument count)
    const arityCandidates = overloads
        .map((overload, index) => ({ overload, index }))
        .filter(({ overload }) => overload.paramTypes.length === argCount);

    if (arityCandidates.length === 0) {
        // No overload matches the argument count
        const signatures = formatOverloads(overloads);
        throwDiagnostic("VF4201", callLoc, { name, argCount: String(argCount), signatures });
    }

    // Step 2: Filter by type compatibility
    // TODO: When type-directed resolution is needed, add type-based filtering
    // here. Arity-only resolution matches the spec's documented strategy.

    const candidates = arityCandidates;

    if (candidates.length === 1) {
        // Exactly one match - success!
        const selected = candidates[0];
        if (!selected) {
            // Should never happen given the length check - internal error
            throw new Error(`Internal error resolving call to '${name}': expected a candidate but found none.`);
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
    // This happens when multiple overloads share an arity and differ only in
    // parameter types (resolution is arity-based per the spec).
    throwDiagnostic("VF4205", callLoc, { name });
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
 * Format a Core type expression for display in error messages
 *
 * @param typeExpr - The type expression to format
 * @returns A human-readable type string
 */
function formatType(typeExpr: CoreTypeExpr): string {
    switch (typeExpr.kind) {
        case "CoreTypeVar":
            return typeExpr.name;
        case "CoreTypeConst":
            return typeExpr.name;
        case "CoreFunctionType": {
            const params = typeExpr.params.map((p) => formatType(p)).join(", ");
            const returnType = formatType(typeExpr.return_);
            return `(${params}) -> ${returnType}`;
        }
        case "CoreTypeApp": {
            const constructor = formatType(typeExpr.constructor);
            const args = typeExpr.args.map((a) => formatType(a)).join(", ");
            return `${constructor}<${args}>`;
        }
        case "CoreRecordType": {
            const fields = typeExpr.fields.map((f) => `${f.name}: ${formatType(f.typeExpr)}`).join(", ");
            return `{ ${fields} }`;
        }
        case "CoreVariantType": {
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
        case "CoreUnionType": {
            return typeExpr.types.map((t) => formatType(t)).join(" | ");
        }
        case "CoreTupleType": {
            const elements = typeExpr.elements.map((e) => formatType(e)).join(", ");
            return `(${elements})`;
        }
        case "CoreStringLiteralType":
            return JSON.stringify(typeExpr.value);
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
