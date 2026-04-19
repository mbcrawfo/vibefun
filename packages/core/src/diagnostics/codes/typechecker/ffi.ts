/**
 * External/FFI Errors (VF4800-VF4805)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF4800: DiagnosticDefinition = {
    code: "VF4800",
    title: "FFIError",
    messageTemplate: "{message}",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Check the external declaration",
    explanation:
        "An error occurred with an external (FFI) declaration. This could be a configuration issue " +
        "or type mismatch between Vibefun and JavaScript.",
    example: {
        bad: 'external invalid: -> Int = "js_function"',
        good: 'external valid: () -> Int = "js_function"',
        description: "Fixed function type syntax",
    },
    relatedCodes: ["VF4801", "VF4802"],
};

export const VF4801: DiagnosticDefinition = {
    code: "VF4801",
    title: "FFIInconsistentName",
    messageTemplate: "Inconsistent JavaScript names for '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "All overloads must map to the same JavaScript function",
    explanation:
        "When declaring overloads for an external function, all overloads must use the same " +
        'JavaScript name in the = "name" part.',
    example: {
        bad: 'external parse: (String) -> Int = "parseInt"\nexternal parse: (String, Int) -> Int = "parseInt2"',
        good: 'external parse: (String) -> Int = "parseInt"\nexternal parse: (String, Int) -> Int = "parseInt"',
        description: "Used same JS name for both overloads",
    },
    relatedCodes: ["VF4800", "VF4802"],
};

export const VF4802: DiagnosticDefinition = {
    code: "VF4802",
    title: "FFIInconsistentImport",
    messageTemplate: "Inconsistent module imports for '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "All overloads must have the same 'from' clause",
    explanation:
        "When declaring overloads for an external function, all overloads must import from " +
        "the same module (or all have no import).",
    example: {
        bad: 'external parse: (String) -> Int = "parse" from "lib1"\nexternal parse: (String, Int) -> Int = "parse" from "lib2"',
        good: 'external parse: (String) -> Int = "parse" from "lib"\nexternal parse: (String, Int) -> Int = "parse" from "lib"',
        description: "Used same import source for both overloads",
    },
    relatedCodes: ["VF4800", "VF4801"],
};

export const VF4803: DiagnosticDefinition = {
    code: "VF4803",
    title: "FFINotFunction",
    messageTemplate: "Overloaded external '{name}' must have function type",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Only functions can be overloaded",
    explanation:
        "External declarations can only be overloaded if they have function types. " +
        "Non-function external values cannot have multiple declarations.",
    example: {
        bad: 'external PI: Float = "Math.PI"\nexternal PI: Float = "Math.PI"',
        good: 'external PI: Float = "Math.PI"',
        description: "Removed duplicate non-function external",
    },
    relatedCodes: ["VF4800"],
};

export const VF4804: DiagnosticDefinition = {
    code: "VF4804",
    title: "FFIOverloadNotSupported",
    messageTemplate: "Overloaded external '{name}' not yet supported in this context",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Overloaded externals require explicit overload resolution",
    explanation:
        "Overloaded external functions cannot be used as first-class values or in certain contexts. " +
        "You must call them directly with the appropriate arguments for overload resolution.",
    example: {
        bad: "let f = overloadedExternal  // cannot use as value",
        good: "let result = overloadedExternal(arg)",
        description: "Called directly instead of using as value",
    },
    relatedCodes: ["VF4800", "VF4205"],
};

export const VF4805: DiagnosticDefinition = {
    code: "VF4805",
    title: "ExternalCallOutsideUnsafe",
    messageTemplate: "External '{name}' can only be referenced inside an unsafe block",
    severity: "error",
    phase: "typechecker",
    category: "ffi",
    hintTemplate: "Wrap the call in `unsafe { ... }` or expose a safe wrapper that does",
    explanation:
        "Calling or referencing an `external` binding is a trust boundary with JavaScript, so the " +
        "language requires those references to appear inside an `unsafe` block. Pure Vibefun code " +
        "that does not reach the FFI does not need `unsafe`, and a function whose body wraps its own " +
        "call in `unsafe` can be invoked without further ceremony.",
    example: {
        bad: 'external log: (String) -> Unit = "console.log";\nlog("hello");',
        good: 'external log: (String) -> Unit = "console.log";\nlet _ = unsafe { log("hello") };',
        description: "Wrapped the external call in an unsafe block",
    },
    relatedCodes: ["VF4800"],
};

export const ffiCodes: readonly DiagnosticDefinition[] = [VF4800, VF4801, VF4802, VF4803, VF4804, VF4805];
