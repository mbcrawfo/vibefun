/**
 * Record Errors (VF4500-VF4502)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF4500: DiagnosticDefinition = {
    code: "VF4500",
    title: "NonRecordAccess",
    messageTemplate: "Cannot access field on non-record type {actual}",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Field access is only valid on record types",
    explanation:
        "You tried to access a field using dot notation, but the value is not a record. " +
        "Only record types have fields that can be accessed with .fieldName.",
    example: {
        bad: "let x = [1, 2, 3]\nlet y = x.length",
        good: "let x = [1, 2, 3]\nlet y = List.length(x)",
        description: "Used function call instead of field access",
    },
    relatedCodes: ["VF4014", "VF4501"],
};

export const VF4501: DiagnosticDefinition = {
    code: "VF4501",
    title: "MissingRecordField",
    messageTemplate: "Field '{field}' not found in record type",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Available fields: {availableFields}",
    explanation:
        "The record does not have a field with this name. This might be a typo or you may be " +
        "using the wrong record type.",
    example: {
        bad: 'let person = { name: "Alice" }\nlet age = person.age',
        good: 'let person = { name: "Alice", age: 30 }\nlet age = person.age',
        description: "Added age field to record",
    },
    relatedCodes: ["VF4103", "VF4500"],
};

export const VF4502: DiagnosticDefinition = {
    code: "VF4502",
    title: "DuplicateRecordField",
    messageTemplate: "Duplicate field '{field}' in record",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Each field name can only appear once in a record",
    explanation:
        "The same field name appears multiple times in the record. Each field must have a " +
        "unique name within a record.",
    example: {
        bad: "let point = { x: 1, y: 2, x: 3 }",
        good: "let point = { x: 3, y: 2 }",
        description: "Removed duplicate x field",
    },
    relatedCodes: ["VF4501"],
};

export const recordCodes: readonly DiagnosticDefinition[] = [VF4500, VF4501, VF4502];
