/**
 * Variant Errors (VF4600-VF4602)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF4600: DiagnosticDefinition = {
    code: "VF4600",
    title: "UnknownConstructor",
    messageTemplate: "Unknown constructor '{name}' for variant type",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Available constructors: {constructors}",
    explanation:
        "The constructor name is not part of the expected variant type. Check the spelling " +
        "or the variant type definition.",
    example: {
        bad: "type Color = Red | Green | Blue\nlet c: Color = Purple",
        good: "type Color = Red | Green | Blue\nlet c: Color = Red",
        description: "Used a valid constructor",
    },
    relatedCodes: ["VF4102", "VF4200"],
};

export const VF4601: DiagnosticDefinition = {
    code: "VF4601",
    title: "ConstructorArgMismatch",
    messageTemplate: "Constructor '{name}' argument type mismatch: expected {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Check the constructor's expected argument types",
    explanation:
        "The type of the argument passed to a constructor does not match the expected type. " +
        "Check the variant type definition for the correct argument types.",
    example: {
        bad: 'let x = Some("hello")  // if Option<Int>',
        good: "let x = Some(42)",
        description: "Used correct argument type",
    },
    relatedCodes: ["VF4200", "VF4002"],
};

export const VF4602: DiagnosticDefinition = {
    code: "VF4602",
    title: "VariantMismatch",
    messageTemplate: "Expected variant type {expected}, got {actual}",
    severity: "error",
    phase: "typechecker",
    category: "variant",
    hintTemplate: "Check that the variant type matches",
    explanation:
        "The variant type does not match what was expected. This typically happens when using " +
        "a constructor from a different variant type than expected.",
    example: {
        bad: "type A = X | Y\ntype B = M | N\nlet a: A = M",
        good: "type A = X | Y\nlet a: A = X",
        description: "Used constructor from correct type",
    },
    relatedCodes: ["VF4025"],
};

export const variantCodes: readonly DiagnosticDefinition[] = [VF4600, VF4601, VF4602];
