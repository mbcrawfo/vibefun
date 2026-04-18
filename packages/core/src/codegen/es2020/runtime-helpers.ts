/**
 * Runtime helper generation for ES2020 code generation
 *
 * These helpers are injected into generated code when needed:
 * - ref(): Creates mutable reference cells { $value: ... }
 * - $eq(): Structural equality comparison for composite types
 */

/**
 * Generate the ref() helper function
 *
 * Used to create mutable reference cells:
 * ```javascript
 * const ref = ($value) => ({ $value });
 * ```
 *
 * @returns JavaScript code for the ref helper
 */
export function generateRefHelper(): string {
    return `const ref = ($value) => ({ $value });`;
}

/**
 * Generate the $eq() helper function
 *
 * Provides structural equality for composite types:
 * - Refs: Identity comparison only (refs are never structurally equal)
 * - Variants: Compare $tag and all $N fields recursively
 * - Tuples (arrays): Compare length and elements recursively
 * - Records: Compare keys and values recursively
 *
 * Primitive types use === directly (handled in emit-expressions.ts)
 *
 * @returns JavaScript code for the $eq helper
 */
export function generateEqHelper(): string {
    // Use template literal for readable multi-line output
    return `const $eq = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if ("$value" in a && "$value" in b) return a === b;
  if ("$tag" in a) {
    if (!("$tag" in b) || a.$tag !== b.$tag) return false;
    for (let i = 0; (\`$\${i}\`) in a; i++) {
      if (!$eq(a[\`$\${i}\`], b[\`$\${i}\`])) return false;
    }
    return true;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => $eq(v, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => k in b && $eq(a[k], b[k]));
};`;
}

/**
 * Generate the $intDiv() helper function
 *
 * Integer division with runtime zero-divisor check. Spec
 * (04-expressions/basic-expressions.md) requires division by zero to
 * panic at runtime.
 *
 * @returns JavaScript code for the $intDiv helper
 */
export function generateIntDivHelper(): string {
    return `const $intDiv = (a, b) => { if (b === 0) throw new Error("Division by zero"); return Math.trunc(a / b); };`;
}

/**
 * Generate the $intMod() helper function
 *
 * Integer modulo with runtime zero-divisor check.
 *
 * @returns JavaScript code for the $intMod helper
 */
export function generateIntModHelper(): string {
    return `const $intMod = (a, b) => { if (b === 0) throw new Error("Division by zero"); return a % b; };`;
}

/**
 * Generate all needed runtime helpers based on context flags
 *
 * @param flags - Which helpers are needed
 * @returns JavaScript code for all needed helpers (empty string if none)
 */
export function generateRuntimeHelpers(flags: {
    needsRef: boolean;
    needsEq: boolean;
    needsIntDiv: boolean;
    needsIntMod: boolean;
}): string {
    const helpers: string[] = [];

    if (flags.needsRef) {
        helpers.push(generateRefHelper());
    }

    if (flags.needsEq) {
        helpers.push(generateEqHelper());
    }

    if (flags.needsIntDiv) {
        helpers.push(generateIntDivHelper());
    }

    if (flags.needsIntMod) {
        helpers.push(generateIntModHelper());
    }

    if (helpers.length === 0) {
        return "";
    }

    return helpers.join("\n");
}
