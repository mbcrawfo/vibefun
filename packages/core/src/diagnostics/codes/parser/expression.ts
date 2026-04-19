/**
 * Expression Parsing Errors (VF2100-VF2199)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2100: DiagnosticDefinition = {
    code: "VF2100",
    title: "ExpectedExpression",
    messageTemplate: "Expected expression",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Expected a value, variable, function call, or other expression",
    explanation:
        "The parser expected to find an expression at this position. " +
        "This error occurs when encountering an unexpected token where " +
        "a value, variable, operator expression, or function call was expected.",
    example: {
        bad: "let x = + 5",
        good: "let x = 1 + 5",
        description: "Added left operand to the binary expression",
    },
    relatedCodes: ["VF2101", "VF2102"],
};

export const VF2101: DiagnosticDefinition = {
    code: "VF2101",
    title: "UnexpectedToken",
    messageTemplate: "Unexpected {tokenType}: '{value}'",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "{hint}",
    explanation:
        "The parser encountered a token that doesn't make sense in this context. " +
        "This might be a reserved keyword used incorrectly, a misplaced operator, " +
        "or some other syntax error.",
    example: {
        bad: "let x = then",
        good: "let x = 42",
        description: "Replaced reserved keyword 'then' with a valid expression",
    },
    relatedCodes: ["VF2100"],
};

export const VF2102: DiagnosticDefinition = {
    code: "VF2102",
    title: "ExpectedClosingParen",
    messageTemplate: "Expected ')' after {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add a closing parenthesis to match the opening '('",
    explanation:
        "A closing parenthesis is missing. Every opening parenthesis '(' must have " +
        "a matching closing parenthesis ')'. Check for mismatched parentheses in your expression.",
    example: {
        bad: "let x = (1 + 2",
        good: "let x = (1 + 2)",
        description: "Added missing closing parenthesis",
    },
    relatedCodes: ["VF2103", "VF2104"],
};

export const VF2103: DiagnosticDefinition = {
    code: "VF2103",
    title: "ExpectedClosingBracket",
    messageTemplate: "Expected ']' after {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add a closing bracket to match the opening '['",
    explanation:
        "A closing bracket is missing. Every opening bracket '[' must have " +
        "a matching closing bracket ']'. This usually occurs in list literals or list patterns.",
    example: {
        bad: "let xs = [1, 2, 3",
        good: "let xs = [1, 2, 3]",
        description: "Added missing closing bracket",
    },
    relatedCodes: ["VF2102", "VF2104"],
};

export const VF2104: DiagnosticDefinition = {
    code: "VF2104",
    title: "ExpectedClosingBrace",
    messageTemplate: "Expected '}' after {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add a closing brace to match the opening '{'",
    explanation:
        "A closing brace is missing. Every opening brace '{' must have " +
        "a matching closing brace '}'. This usually occurs in record literals, record types, or blocks.",
    example: {
        bad: "let point = { x: 1, y: 2",
        good: "let point = { x: 1, y: 2 }",
        description: "Added missing closing brace",
    },
    relatedCodes: ["VF2102", "VF2103"],
};

export const VF2105: DiagnosticDefinition = {
    code: "VF2105",
    title: "ExpectedThen",
    messageTemplate: "Expected 'then' after if condition",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add 'then' keyword: if condition then consequence else alternative",
    explanation:
        "In vibefun, if-expressions require the 'then' keyword between the condition " +
        "and the consequent branch. This is different from some languages that use braces.",
    example: {
        bad: "if x > 0 x else -x",
        good: "if x > 0 then x else -x",
        description: "Added 'then' keyword after the condition",
    },
};

export const VF2106: DiagnosticDefinition = {
    code: "VF2106",
    title: "ExpectedArrow",
    messageTemplate: "Expected '->' after {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add '->' to separate parameters from body",
    explanation:
        "Lambda expressions and match cases require '->' to separate the parameters " +
        "or pattern from the body expression.",
    example: {
        bad: "let f = (x, y) x + y",
        good: "let f = (x, y) -> x + y",
        description: "Added '->' between parameters and body",
    },
};

export const VF2107: DiagnosticDefinition = {
    code: "VF2107",
    title: "ExpectedStatementSeparator",
    messageTemplate: "Expected ';' or newline between {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add a semicolon or newline to separate statements",
    explanation:
        "Statements in a block must be separated by semicolons or newlines. " +
        "This error occurs when two statements appear on the same line without a separator.",
    example: {
        bad: "{ let x = 1 let y = 2; x + y }",
        good: "{ let x = 1; let y = 2; x + y }",
        description: "Added semicolon between statements",
    },
};

export const VF2108: DiagnosticDefinition = {
    code: "VF2108",
    title: "EmptySpread",
    messageTemplate: "Empty spread operator in {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "The spread operator (...) must be followed by an expression",
    explanation:
        "The spread operator (...) cannot stand alone - it must be followed by an expression " +
        "to spread. In records, use {...base} to spread a base record. In lists, use [...xs] to spread a list.",
    example: {
        bad: "let x = {...}",
        good: "let x = {...base}",
        description: "Added expression after spread operator",
    },
};

export const VF2109: DiagnosticDefinition = {
    code: "VF2109",
    title: "UnexpectedEmptyExpressionList",
    messageTemplate: "Unexpected empty expression list",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "This context requires at least one expression",
    explanation:
        "The parser expected to find at least one expression in this context, " + "but found an empty list instead.",
    example: {
        bad: "let x = ()",
        good: "let x = (1, 2)",
        description: "Added expressions to the tuple",
    },
};

export const VF2110: DiagnosticDefinition = {
    code: "VF2110",
    title: "ExpectedCommaOrSeparator",
    messageTemplate: "Expected ',' or '{expected}' after {context}",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Add a comma to separate items or close the {context}",
    explanation:
        "Items in a list, tuple, record, or function call must be separated by commas. " +
        "This error occurs when two items appear without a comma between them.",
    example: {
        bad: "let xs = [1 2 3]",
        good: "let xs = [1, 2, 3]",
        description: "Added commas between list elements",
    },
};

export const VF2111: DiagnosticDefinition = {
    code: "VF2111",
    title: "RecordMixedSyntax",
    messageTemplate: "Cannot mix field assignments and shorthand in record without comma",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Separate record fields with commas: { field1: value1, field2 }",
    explanation:
        "Record literals can use shorthand syntax (just the field name when the variable " +
        "has the same name) or explicit syntax (field: value), but all fields must be " +
        "separated by commas.",
    example: {
        bad: "{ x: 1 name }",
        good: "{ x: 1, name }",
        description: "Added comma between fields",
    },
};

export const VF2112: DiagnosticDefinition = {
    code: "VF2112",
    title: "OperatorSectionNotSupported",
    messageTemplate: "Operator sections are not supported",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "{hint}",
    explanation:
        "Operator sections (like (+) or (+ 1)) from Haskell are not supported in vibefun. " +
        "Use a lambda expression instead to create a function from an operator.",
    example: {
        bad: "(+)",
        good: "(x, y) -> x + y",
        description: "Used lambda instead of operator section",
    },
};

export const VF2113: DiagnosticDefinition = {
    code: "VF2113",
    title: "UnexpectedReturnTypeAnnotation",
    messageTemplate: "Unexpected return type annotation",
    severity: "error",
    phase: "parser",
    category: "expression",
    hintTemplate: "Return type annotations are only valid for lambda expressions. Expected '=>' after type",
    explanation:
        "A return type annotation (: Type) was found without a corresponding lambda (=>). " +
        "Return type annotations can only be used on lambda expressions.",
    example: {
        bad: "(): Int",
        good: "(): Int => 42",
        description: "Added lambda body after return type",
    },
};

export const expressionCodes: readonly DiagnosticDefinition[] = [
    VF2100,
    VF2101,
    VF2102,
    VF2103,
    VF2104,
    VF2105,
    VF2106,
    VF2107,
    VF2108,
    VF2109,
    VF2110,
    VF2111,
    VF2112,
    VF2113,
];
