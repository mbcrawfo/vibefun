/**
 * Type checker diagnostic codes (VF4xxx)
 *
 * Error codes for the type checking and type inference phase.
 *
 * Subcategory allocation:
 * - VF4000-VF4019: Type mismatch errors
 * - VF4020-VF4029: Unification errors
 * - VF4100-VF4199: Undefined reference errors
 * - VF4200-VF4299: Arity errors
 * - VF4300-VF4399: Infinite type / recursive errors
 * - VF4400-VF4499: Pattern matching errors
 * - VF4500-VF4599: Record errors
 * - VF4600-VF4699: Variant errors
 * - VF4700-VF4799: Polymorphism errors
 * - VF4800-VF4899: External/FFI errors
 * - VF4900-VF4999: Type warnings
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

import { registry } from "../../registry.js";
import { arityCodes } from "./arity.js";
import { ffiCodes } from "./ffi.js";
import { infiniteCodes } from "./infinite.js";
import { mismatchCodes } from "./mismatch.js";
import { patternCodes } from "./pattern.js";
import { polymorphismCodes } from "./polymorphism.js";
import { recordCodes } from "./record.js";
import { undefinedCodes } from "./undefined.js";
import { unificationCodes } from "./unification.js";
import { variantCodes } from "./variant.js";
import { warningsCodes } from "./warnings.js";

export * from "./arity.js";
export * from "./ffi.js";
export * from "./infinite.js";
export * from "./mismatch.js";
export * from "./pattern.js";
export * from "./polymorphism.js";
export * from "./record.js";
export * from "./undefined.js";
export * from "./unification.js";
export * from "./variant.js";
export * from "./warnings.js";

const typecheckerCodes: readonly DiagnosticDefinition[] = [
    // Type mismatch (VF4000-VF4019)
    ...mismatchCodes,
    // Unification (VF4020-VF4029)
    ...unificationCodes,
    // Undefined references (VF4100-VF4199)
    ...undefinedCodes,
    // Arity (VF4200-VF4299)
    ...arityCodes,
    // Infinite types (VF4300-VF4399)
    ...infiniteCodes,
    // Pattern matching (VF4400-VF4499)
    ...patternCodes,
    // Records (VF4500-VF4599)
    ...recordCodes,
    // Variants (VF4600-VF4699)
    ...variantCodes,
    // Polymorphism (VF4700-VF4799)
    ...polymorphismCodes,
    // FFI (VF4800-VF4899)
    ...ffiCodes,
    // Warnings (VF4900-VF4999) + Module system (VF5102 - lives here for convenience)
    ...warningsCodes,
];

/**
 * Register all typechecker diagnostic codes with the global registry.
 */
export function registerTypecheckerCodes(): void {
    registry.registerAll(typecheckerCodes);
}
