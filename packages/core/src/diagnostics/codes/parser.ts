/**
 * Parser diagnostic codes (VF2xxx)
 *
 * Error codes for the parsing phase.
 *
 * Subcategory allocation:
 * - VF2000-VF2099: Declaration parsing errors
 * - VF2100-VF2199: Expression parsing errors
 * - VF2200-VF2299: Pattern parsing errors
 * - VF2300-VF2399: Type expression parsing errors
 * - VF2400-VF2499: Import/export parsing errors
 * - VF2500-VF2599: General syntax errors
 * - VF2900-VF2999: Parser warnings (reserved)
 */

import type { DiagnosticDefinition } from "../diagnostic.js";

import { registry } from "../registry.js";

// =============================================================================
// VF2000-VF2099: Declaration Parsing Errors
// =============================================================================

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

// =============================================================================
// VF2100-VF2199: Expression Parsing Errors
// =============================================================================

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

// =============================================================================
// VF2200-VF2299: Pattern Parsing Errors
// =============================================================================

export const VF2200: DiagnosticDefinition = {
    code: "VF2200",
    title: "ExpectedPattern",
    messageTemplate: "Expected pattern",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Expected a pattern (variable, wildcard, literal, constructor, record, or list)",
    explanation:
        "The parser expected to find a pattern at this position. " +
        "Patterns are used in let bindings, match expressions, and function parameters " +
        "to destructure values and bind variables.",
    example: {
        bad: "let = 42",
        good: "let x = 42",
        description: "Added variable pattern to bind the value",
    },
    relatedCodes: ["VF2201", "VF2202"],
};

export const VF2201: DiagnosticDefinition = {
    code: "VF2201",
    title: "KeywordShorthandNotAllowed",
    messageTemplate: "Cannot use keyword '{keyword}' in field shorthand",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Use explicit syntax: { {keyword}: pattern }",
    explanation:
        "Keywords cannot be used with field shorthand syntax in patterns because they would " +
        "conflict with their reserved meaning. Use the explicit colon syntax instead.",
    example: {
        bad: "let { type } = obj",
        good: "let { type: t } = obj",
        description: "Used explicit syntax to rename the field",
    },
};

export const VF2202: DiagnosticDefinition = {
    code: "VF2202",
    title: "TypeAnnotatedRecordShorthand",
    messageTemplate: "Type-annotated record shorthand must use variable pattern",
    severity: "error",
    phase: "parser",
    category: "pattern",
    hintTemplate: "Expected (fieldName: Type)",
    explanation:
        "When using type annotations in record pattern shorthand, the inner pattern " +
        "must be a simple variable pattern. Complex patterns cannot be used with this shorthand.",
    example: {
        bad: "let { ((x, y): Point) } = obj",
        good: "let { (point: Point) } = obj",
        description: "Used simple variable pattern with type annotation",
    },
};

// =============================================================================
// VF2300-VF2399: Type Expression Parsing Errors
// =============================================================================

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

// =============================================================================
// VF2400-VF2499: Import/Export Parsing Errors
// =============================================================================

export const VF2400: DiagnosticDefinition = {
    code: "VF2400",
    title: "ExpectedImportSpecifier",
    messageTemplate: "Expected '{' or '*' after 'import'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Use: import { name } from "module" or import * as Name from "module"',
    explanation:
        "Import declarations must specify what to import using either named imports " +
        "(with braces) or namespace imports (with *). Bare imports are not supported.",
    example: {
        bad: 'import foo from "module"',
        good: 'import { foo } from "module"',
        description: "Used named import syntax with braces",
    },
    relatedCodes: ["VF2401", "VF2402"],
};

export const VF2401: DiagnosticDefinition = {
    code: "VF2401",
    title: "ExpectedExportSpecifier",
    messageTemplate: "Expected '{' or '*' after 'export'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Use: export { name } from "module" or export * from "module"',
    explanation:
        "Re-export declarations must specify what to export using either named exports " +
        "(with braces) or namespace exports (with *).",
    example: {
        bad: 'export foo from "module"',
        good: 'export { foo } from "module"',
        description: "Used named export syntax with braces",
    },
    relatedCodes: ["VF2400", "VF2402"],
};

export const VF2402: DiagnosticDefinition = {
    code: "VF2402",
    title: "ExpectedFromKeyword",
    messageTemplate: "Expected 'from' keyword",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Add "from" followed by the module path: from "module-path"',
    explanation:
        "Import and re-export declarations require the 'from' keyword followed by " +
        "the module path as a string literal.",
    example: {
        bad: 'import { foo } "module"',
        good: 'import { foo } from "module"',
        description: "Added 'from' keyword before module path",
    },
    relatedCodes: ["VF2400", "VF2403"],
};

export const VF2403: DiagnosticDefinition = {
    code: "VF2403",
    title: "ExpectedModulePath",
    messageTemplate: "Expected module path string",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Provide the module path as a string: from "path/to/module"',
    explanation:
        "The 'from' keyword must be followed by a string literal containing the module path. " +
        "Module paths can be relative (starting with ./ or ../) or package names.",
    example: {
        bad: "import { foo } from module",
        good: 'import { foo } from "./module"',
        description: "Used string literal for module path",
    },
    relatedCodes: ["VF2402"],
};

export const VF2404: DiagnosticDefinition = {
    code: "VF2404",
    title: "ExpectedAsAfterStar",
    messageTemplate: "Expected 'as' after '*'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Namespace imports require an alias: import * as Name from "module"',
    explanation:
        "When using namespace imports (import *), you must provide an alias using 'as'. " +
        "This alias becomes the namespace through which all exports are accessed.",
    example: {
        bad: 'import * from "module"',
        good: 'import * as Module from "module"',
        description: "Added 'as Module' to provide namespace alias",
    },
    relatedCodes: ["VF2400"],
};

// =============================================================================
// VF2500-VF2599: General Syntax Errors
// =============================================================================

export const VF2500: DiagnosticDefinition = {
    code: "VF2500",
    title: "TooManyErrors",
    messageTemplate: "Too many parse errors ({count}). Stopping.",
    severity: "error",
    phase: "parser",
    category: "general",
    explanation:
        "The parser encountered too many errors and stopped. " +
        "Fix the earlier errors first - they often cause cascading errors later in the file.",
    example: {
        bad: "let x =\nlet y =\nlet z =",
        good: "let x = 1\nlet y = 2\nlet z = 3",
        description: "Fixed multiple incomplete declarations",
    },
};

export const VF2501: DiagnosticDefinition = {
    code: "VF2501",
    title: "ExpectedToken",
    messageTemplate: "Expected {expected}, but found {actual}",
    severity: "error",
    phase: "parser",
    category: "general",
    explanation:
        "The parser expected a specific token at this position but found something else. " +
        "This is a general syntax error that can occur in various contexts.",
    example: {
        bad: "let x 42",
        good: "let x = 42",
        description: "Added the expected '=' token",
    },
};

// =============================================================================
// Registration
// =============================================================================

const parserCodes: readonly DiagnosticDefinition[] = [
    // Declaration parsing (VF2000-VF2099)
    VF2000,
    VF2001,
    VF2002,
    VF2003,
    VF2004,
    VF2005,
    VF2006,
    VF2007,
    // Expression parsing (VF2100-VF2199)
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
    // Pattern parsing (VF2200-VF2299)
    VF2200,
    VF2201,
    VF2202,
    // Type expression parsing (VF2300-VF2399)
    VF2300,
    VF2301,
    VF2302,
    VF2303,
    VF2304,
    // Import/export parsing (VF2400-VF2499)
    VF2400,
    VF2401,
    VF2402,
    VF2403,
    VF2404,
    // General syntax errors (VF2500-VF2599)
    VF2500,
    VF2501,
];

/**
 * Register all parser diagnostic codes with the global registry.
 */
export function registerParserCodes(): void {
    registry.registerAll(parserCodes);
}
