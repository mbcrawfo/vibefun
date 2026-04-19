/**
 * Type Expression Parsing Errors (VF2300-VF2399)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2300: DiagnosticDefinition = {
    code: "VF2300",
    title: "ExpectedTypeName",
    messageTemplate: "Expected type name",
    severity: "error",
    phase: "parser",
    category: "type",
    hintTemplate: "Expected a type identifier (e.g., Int, String, Option<T>)",
    explanation:
        "The parser expected to find a type name at this position. " +
        "Type names are identifiers like Int, String, List<T>, or user-defined types.",
    example: {
        bad: "type = Int",
        good: "type Point = Int",
        description: "Added type name 'Point'",
    },
};

export const VF2301: DiagnosticDefinition = {
    code: "VF2301",
    title: "ExpectedTypeExpression",
    messageTemplate: "Expected type expression",
    severity: "error",
    phase: "parser",
    category: "type",
    hintTemplate: "Expected a type (variable, constant, function type, record type, or parenthesized type)",
    explanation:
        "The parser expected to find a type expression at this position. " +
        "This could be a type variable (lowercase like 't'), type constant (PascalCase like 'Int'), " +
        "function type (T -> U), record type ({ x: Int }), or parenthesized type.",
    example: {
        bad: "type Point = { x: }",
        good: "type Point = { x: Int }",
        description: "Added type expression after the colon",
    },
    relatedCodes: ["VF2300"],
};

export const VF2302: DiagnosticDefinition = {
    code: "VF2302",
    title: "ExpectedTypeParameter",
    messageTemplate: "Expected type parameter",
    severity: "error",
    phase: "parser",
    category: "type",
    hintTemplate: "Type parameters must be identifiers (e.g., T, a, elem)",
    explanation:
        "Type parameter lists (in angle brackets) must contain valid identifiers. " +
        "Type parameters are typically single letters like T, U, V or descriptive names like elem, key.",
    example: {
        bad: "type Box<<T>> = { value: T }",
        good: "type Box<T> = { value: T }",
        description: "Fixed malformed type parameter syntax",
    },
};

export const VF2303: DiagnosticDefinition = {
    code: "VF2303",
    title: "ExpectedClosingAngle",
    messageTemplate: "Expected '>' after type {context}",
    severity: "error",
    phase: "parser",
    category: "type",
    hintTemplate: "Add '>' to close the type parameter or argument list",
    explanation:
        "Type parameter lists (<T, U>) and type argument lists (List<Int>) must be " +
        "closed with '>'. This error occurs when the closing angle bracket is missing.",
    example: {
        bad: "type Box<T = { value: T }",
        good: "type Box<T> = { value: T }",
        description: "Added closing '>' after type parameter",
    },
};

export const VF2304: DiagnosticDefinition = {
    code: "VF2304",
    title: "ExpectedColonInRecordType",
    messageTemplate: "Expected ':' after field name in record type",
    severity: "error",
    phase: "parser",
    category: "type",
    hintTemplate: "Record type fields require the syntax: { fieldName: Type }",
    explanation:
        "In record type definitions, each field must have a type annotation with the " +
        "syntax 'fieldName: Type'. Unlike record expressions, shorthand is not allowed in types.",
    example: {
        bad: "type Point = { x y: Int }",
        good: "type Point = { x: Int, y: Int }",
        description: "Added colon and type for each field",
    },
};

export const typeCodes: readonly DiagnosticDefinition[] = [VF2300, VF2301, VF2302, VF2303, VF2304];
