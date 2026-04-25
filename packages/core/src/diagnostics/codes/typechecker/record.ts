/**
 * Record Errors (VF4500-VF4504)
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

export const VF4503: DiagnosticDefinition = {
    code: "VF4503",
    title: "MissingRequiredField",
    messageTemplate: "Record is missing required field '{field}' (expected {expected}, got {actual})",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Add field '{field}' to the record, or change the expected type",
    explanation:
        "A record value is being used where a record type with more fields is expected. " +
        "Width subtyping allows a record to have *extra* fields the expected type does not name, " +
        "but every field the expected type requires must be present in the actual value.",
    example: {
        bad: 'let greet = (p: { name: String, age: Int }) => p.name\nlet partial = { name: "Alice" }\nlet r = greet(partial)',
        good: 'let greet = (p: { name: String, age: Int }) => p.name\nlet full = { name: "Alice", age: 30 }\nlet r = greet(full)',
        description: "Provided the missing age field expected by greet's parameter type",
    },
    relatedCodes: ["VF4501"],
};

export const VF4504: DiagnosticDefinition = {
    code: "VF4504",
    title: "RecordExtraFieldInInvariantPosition",
    messageTemplate:
        "Record has unexpected field '{field}' not allowed at this generic-parameter position " +
        "(expected {expected}, got {actual})",
    severity: "error",
    phase: "typechecker",
    category: "record",
    hintTemplate: "Generic type parameters are invariant — record fields must match exactly here",
    explanation:
        "Width subtyping permits records with extra fields in ordinary parameter positions, but " +
        "generic type parameters are strictly invariant per spec docs/spec/03-type-system/subtyping.md " +
        '"Type Parameter Invariance". Inside a generic type argument like `Box<{x:Int}>`, the ' +
        "actual record's fields must match the expected fields exactly.",
    example: {
        bad: "type Box<T> = { value: T }\nlet f = (b: Box<{ x: Int }>) => b\nlet b: Box<{ x: Int, y: Int }> = { value: { x: 1, y: 2 } }\nlet result = f(b)",
        good: "type Box<T> = { value: T }\nlet f = (b: Box<{ x: Int, y: Int }>) => b\nlet b: Box<{ x: Int, y: Int }> = { value: { x: 1, y: 2 } }\nlet result = f(b)",
        description: "Aligned the parameter type's record shape with the value's shape",
    },
    relatedCodes: ["VF4503"],
};

export const recordCodes: readonly DiagnosticDefinition[] = [VF4500, VF4501, VF4502, VF4503, VF4504];
