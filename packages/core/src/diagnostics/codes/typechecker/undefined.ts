/**
 * Undefined Reference Errors (VF4100-VF4103)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF4100: DiagnosticDefinition = {
    code: "VF4100",
    title: "UndefinedVariable",
    messageTemplate: "Undefined variable '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Did you mean: {suggestions}?",
    explanation:
        "The variable has not been defined in the current scope. This could be a typo, " +
        "or the variable was defined in a different scope that is not accessible here.",
    example: {
        bad: "let y = x + 1",
        good: "let x = 5\nlet y = x + 1",
        description: "Defined x before using it",
    },
    relatedCodes: ["VF4101", "VF4102"],
};

export const VF4101: DiagnosticDefinition = {
    code: "VF4101",
    title: "UndefinedType",
    messageTemplate: "Undefined type '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Check the type name spelling or import the type",
    explanation:
        "The type has not been defined. This could be a typo, or you need to define the type " +
        "or import it from another module.",
    example: {
        bad: "let x: MyTyp = ...",
        good: "type MyType = ...\nlet x: MyType = ...",
        description: "Defined the type before using it",
    },
    relatedCodes: ["VF4100", "VF4102"],
};

export const VF4102: DiagnosticDefinition = {
    code: "VF4102",
    title: "UndefinedConstructor",
    messageTemplate: "Undefined constructor '{name}'",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Check the constructor name or define the variant type",
    explanation:
        "The constructor has not been defined. Constructors come from variant types and " +
        "must be defined before use.",
    example: {
        bad: "let x = Sme(42)",
        good: "let x = Some(42)",
        description: "Fixed typo in constructor name",
    },
    relatedCodes: ["VF4100", "VF4600"],
};

export const VF4103: DiagnosticDefinition = {
    code: "VF4103",
    title: "UndefinedField",
    messageTemplate: "Field '{field}' does not exist on type {recordType}",
    severity: "error",
    phase: "typechecker",
    category: "undefined",
    hintTemplate: "Available fields: {availableFields}",
    explanation: "The record does not have a field with this name. Check the spelling or the record type definition.",
    example: {
        bad: "let point = { x: 1, y: 2 }\nlet z = point.z",
        good: "let point = { x: 1, y: 2, z: 3 }\nlet z = point.z",
        description: "Added z field to the record",
    },
    relatedCodes: ["VF4500", "VF4501"],
};

export const undefinedCodes: readonly DiagnosticDefinition[] = [VF4100, VF4101, VF4102, VF4103];
