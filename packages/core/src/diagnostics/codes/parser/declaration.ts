/**
 * Declaration Parsing Errors (VF2000-VF2099)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2000: DiagnosticDefinition = {
    code: "VF2000",
    title: "ExpectedDeclarationKeyword",
    messageTemplate: "Expected declaration keyword",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "Expected 'let', 'type', 'external', 'import', or 'export'",
    explanation:
        "The parser expected to find a declaration keyword at this position. " +
        "Top-level declarations must start with one of the declaration keywords: " +
        "'let' for value bindings, 'type' for type declarations, 'external' for FFI declarations, " +
        "'import' for imports, or 'export' for exports.",
    example: {
        bad: "x = 42",
        good: "let x = 42",
        description: "Added 'let' keyword to make it a valid declaration",
    },
    relatedCodes: ["VF2001"],
};

export const VF2001: DiagnosticDefinition = {
    code: "VF2001",
    title: "UnexpectedKeyword",
    messageTemplate: "Unexpected keyword in declaration: {keyword}",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "This keyword cannot start a declaration. Expected 'let', 'type', 'external', or 'import'",
    explanation:
        "The parser found a keyword that cannot start a declaration. " +
        "Keywords like 'then', 'else', 'match', etc. are reserved for use within expressions " +
        "and cannot appear at the start of a declaration.",
    example: {
        bad: "then x = 42",
        good: "let x = 42",
        description: "Replaced invalid keyword with 'let'",
    },
    relatedCodes: ["VF2000"],
};

export const VF2002: DiagnosticDefinition = {
    code: "VF2002",
    title: "ExpectedEquals",
    messageTemplate: "Expected '=' after {context}",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "Add '=' followed by the value or type definition",
    explanation:
        "A declaration requires an '=' sign to separate the pattern or name from " +
        "its value or type definition. This error occurs when the '=' is missing.",
    example: {
        bad: "let x 42",
        good: "let x = 42",
        description: "Added missing '=' between pattern and value",
    },
    relatedCodes: ["VF2000", "VF2010"],
};

export const VF2003: DiagnosticDefinition = {
    code: "VF2003",
    title: "MutableBindingMustUseRef",
    messageTemplate: "Mutable bindings must use ref() syntax",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "Use: let mut {name} = ref({hint})",
    explanation:
        "Mutable bindings in vibefun require explicit use of the ref() wrapper. " +
        "This makes mutability explicit and helps reason about state changes. " +
        "The 'mut' keyword marks the binding as mutable, but the value must be wrapped in ref().",
    example: {
        bad: "let mut counter = 0",
        good: "let mut counter = ref(0)",
        description: "Wrapped the value in ref() for mutable binding",
    },
    relatedCodes: ["VF2004"],
};

export const VF2004: DiagnosticDefinition = {
    code: "VF2004",
    title: "MutableBindingMustUseSimplePattern",
    messageTemplate: "Mutable bindings can only use simple variable patterns",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate:
        "Destructuring patterns like { x, y } or [a, b] are not allowed with 'mut'. Use: let mut x = ref(value)",
    explanation:
        "Mutable bindings cannot use destructuring patterns. " +
        "Each mutable variable must be bound individually using a simple variable pattern. " +
        "This restriction ensures clear ownership of mutable state.",
    example: {
        bad: "let mut { x, y } = ref(point)",
        good: "let mut point = ref({ x: 1, y: 2 })",
        description: "Used simple variable pattern instead of destructuring",
    },
    relatedCodes: ["VF2003"],
};

export const VF2005: DiagnosticDefinition = {
    code: "VF2005",
    title: "AndRequiresLetRec",
    messageTemplate: "The 'and' keyword can only be used with 'let rec' for mutually recursive functions",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "Add 'rec' before the first binding: 'let rec f = ... and g = ...'",
    explanation:
        "The 'and' keyword is used to define mutually recursive functions that reference each other. " +
        "This requires the 'rec' keyword to indicate recursive bindings. " +
        "Without 'rec', bindings are evaluated sequentially and cannot reference each other.",
    example: {
        bad: "let f = (n) => g(n) and g = (n) => f(n)",
        good: "let rec f = (n) => g(n) and g = (n) => f(n)",
        description: "Added 'rec' keyword for mutually recursive definitions",
    },
};

export const VF2006: DiagnosticDefinition = {
    code: "VF2006",
    title: "ExpectedConstructorInVariant",
    messageTemplate: "Expected constructor in variant type",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "Variant constructors must be PascalCase identifiers like Some, None, Ok, Err",
    explanation:
        "Variant types must be defined using constructor names (PascalCase identifiers). " +
        "Each alternative in a variant type starts with a constructor name, optionally " +
        "followed by type arguments in parentheses.",
    example: {
        bad: "type Result<t, e> = success(t) | failure(e)",
        good: "type Result<t, e> = Ok(t) | Err(e)",
        description: "Used PascalCase constructor names",
    },
};

export const VF2007: DiagnosticDefinition = {
    code: "VF2007",
    title: "ExpectedSemicolonInExternalBlock",
    messageTemplate: "Expected ';' after external declaration",
    severity: "error",
    phase: "parser",
    category: "declaration",
    hintTemplate: "External declarations in a block must end with semicolons",
    explanation:
        "When declaring multiple external bindings in a block, each declaration " +
        "must be terminated with a semicolon. This is consistent with other block-style syntax.",
    example: {
        bad: 'external {\n    log: (String) -> Unit = "console.log"\n    warn: (String) -> Unit = "console.warn"\n}',
        good: 'external {\n    log: (String) -> Unit = "console.log";\n    warn: (String) -> Unit = "console.warn";\n}',
        description: "Added semicolons after each declaration in the block",
    },
};

export const declarationCodes: readonly DiagnosticDefinition[] = [
    VF2000,
    VF2001,
    VF2002,
    VF2003,
    VF2004,
    VF2005,
    VF2006,
    VF2007,
];
