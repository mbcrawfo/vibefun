<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Vibefun Error Reference

This reference documents all diagnostic codes (errors and warnings) that the Vibefun compiler can produce. Each code has a unique identifier (VFxxxx) that can be used to quickly find documentation.

## Quick Reference

| Code | Name | Severity | Description |
|------|------|----------|-------------|
| [VF1001](lexer.md#vf1001) | UnterminatedString | Error | Single-line strings (using single double-quotes) cannot contain literal newlines |
| [VF1002](lexer.md#vf1002) | UnterminatedStringEOF | Error | The string literal was not closed before the end of the file |
| [VF1003](lexer.md#vf1003) | UnterminatedMultilineString | Error | The multi-line string literal was not closed before the end of the file |
| [VF1010](lexer.md#vf1010) | InvalidEscapeSequence | Error | The escape sequence is not recognized |
| [VF1011](lexer.md#vf1011) | InvalidHexEscape | Error | The \x escape sequence requires exactly 2 hexadecimal digits to specify a byte value |
| [VF1012](lexer.md#vf1012) | InvalidUnicodeEscape | Error | Unicode escapes must be either \uXXXX with exactly 4 hex digits, or \u{ |
| [VF1100](lexer.md#vf1100) | InvalidNumberSeparator | Error | Numeric separators (underscores) are allowed to improve readability, but they must appear between digits |
| [VF1101](lexer.md#vf1101) | InvalidBinaryLiteral | Error | Binary literals start with 0b or 0B and must contain at least one binary digit (0 or 1) |
| [VF1102](lexer.md#vf1102) | InvalidHexLiteral | Error | Hexadecimal literals start with 0x or 0X and must contain at least one hex digit |
| [VF1103](lexer.md#vf1103) | InvalidOctalLiteral | Error | Octal literals start with 0o or 0O and must contain at least one octal digit (0-7) |
| [VF1104](lexer.md#vf1104) | InvalidScientificNotation | Error | Scientific notation requires at least one digit after the exponent indicator (e or E) |
| [VF1300](lexer.md#vf1300) | UnterminatedComment | Error | Multi-line comments starting with /* must be closed with */ |
| [VF1400](lexer.md#vf1400) | UnexpectedCharacter | Error | The lexer encountered a character that is not part of the vibefun language syntax |
| [VF1500](lexer.md#vf1500) | ReservedKeyword | Error | This identifier is reserved for future language features and cannot be used as a variable name, function name, or any other user-defined identifier |
| [VF2000](parser.md#vf2000) | ExpectedDeclarationKeyword | Error | The parser expected to find a declaration keyword at this position |
| [VF2001](parser.md#vf2001) | UnexpectedKeyword | Error | The parser found a keyword that cannot start a declaration |
| [VF2002](parser.md#vf2002) | ExpectedEquals | Error | A declaration requires an '=' sign to separate the pattern or name from its value or type definition |
| [VF2003](parser.md#vf2003) | MutableBindingMustUseRef | Error | Mutable bindings in vibefun require explicit use of the ref() wrapper |
| [VF2004](parser.md#vf2004) | MutableBindingMustUseSimplePattern | Error | Mutable bindings cannot use destructuring patterns |
| [VF2005](parser.md#vf2005) | AndRequiresLetRec | Error | The 'and' keyword is used to define mutually recursive functions that reference each other |
| [VF2006](parser.md#vf2006) | ExpectedConstructorInVariant | Error | Variant types must be defined using constructor names (PascalCase identifiers) |
| [VF2007](parser.md#vf2007) | ExpectedSemicolonInExternalBlock | Error | When declaring multiple external bindings in a block, each declaration must be terminated with a semicolon |
| [VF2100](parser.md#vf2100) | ExpectedExpression | Error | The parser expected to find an expression at this position |
| [VF2101](parser.md#vf2101) | UnexpectedToken | Error | The parser encountered a token that doesn't make sense in this context |
| [VF2102](parser.md#vf2102) | ExpectedClosingParen | Error | A closing parenthesis is missing |
| [VF2103](parser.md#vf2103) | ExpectedClosingBracket | Error | A closing bracket is missing |
| [VF2104](parser.md#vf2104) | ExpectedClosingBrace | Error | A closing brace is missing |
| [VF2105](parser.md#vf2105) | ExpectedThen | Error | In vibefun, if-expressions require the 'then' keyword between the condition and the consequent branch |
| [VF2106](parser.md#vf2106) | ExpectedArrow | Error | Lambda expressions and match cases require '->' to separate the parameters or pattern from the body expression |
| [VF2107](parser.md#vf2107) | ExpectedStatementSeparator | Error | Statements in a block must be separated by semicolons or newlines |
| [VF2108](parser.md#vf2108) | EmptySpread | Error | The spread operator ( |
| [VF2109](parser.md#vf2109) | UnexpectedEmptyExpressionList | Error | The parser expected to find at least one expression in this context, but found an empty list instead |
| [VF2110](parser.md#vf2110) | ExpectedCommaOrSeparator | Error | Items in a list, tuple, record, or function call must be separated by commas |
| [VF2111](parser.md#vf2111) | RecordMixedSyntax | Error | Record literals can use shorthand syntax (just the field name when the variable has the same name) or explicit syntax (field: value), but all fields must be separated by commas |
| [VF2112](parser.md#vf2112) | OperatorSectionNotSupported | Error | Operator sections (like (+) or (+ 1)) from Haskell are not supported in vibefun |
| [VF2113](parser.md#vf2113) | UnexpectedReturnTypeAnnotation | Error | A return type annotation (: Type) was found without a corresponding lambda (=>) |
| [VF2200](parser.md#vf2200) | ExpectedPattern | Error | The parser expected to find a pattern at this position |
| [VF2201](parser.md#vf2201) | KeywordShorthandNotAllowed | Error | Keywords cannot be used with field shorthand syntax in patterns because they would conflict with their reserved meaning |
| [VF2202](parser.md#vf2202) | TypeAnnotatedRecordShorthand | Error | When using type annotations in record pattern shorthand, the inner pattern must be a simple variable pattern |
| [VF2300](parser.md#vf2300) | ExpectedTypeName | Error | The parser expected to find a type name at this position |
| [VF2301](parser.md#vf2301) | ExpectedTypeExpression | Error | The parser expected to find a type expression at this position |
| [VF2302](parser.md#vf2302) | ExpectedTypeParameter | Error | Type parameter lists (in angle brackets) must contain valid identifiers |
| [VF2303](parser.md#vf2303) | ExpectedClosingAngle | Error | Type parameter lists (<T, U>) and type argument lists (List<Int>) must be closed with '>' |
| [VF2304](parser.md#vf2304) | ExpectedColonInRecordType | Error | In record type definitions, each field must have a type annotation with the syntax 'fieldName: Type' |
| [VF2400](parser.md#vf2400) | ExpectedImportSpecifier | Error | Import declarations must specify what to import using either named imports (with braces) or namespace imports (with *) |
| [VF2401](parser.md#vf2401) | ExpectedExportSpecifier | Error | Re-export declarations must specify what to export using either named exports (with braces) or namespace exports (with *) |
| [VF2402](parser.md#vf2402) | ExpectedFromKeyword | Error | Import and re-export declarations require the 'from' keyword followed by the module path as a string literal |
| [VF2403](parser.md#vf2403) | ExpectedModulePath | Error | The 'from' keyword must be followed by a string literal containing the module path |
| [VF2404](parser.md#vf2404) | ExpectedAsAfterStar | Error | When using namespace imports (import *), you must provide an alias using 'as' |
| [VF2500](parser.md#vf2500) | TooManyErrors | Error | The parser encountered too many errors and stopped |
| [VF2501](parser.md#vf2501) | ExpectedToken | Error | The parser expected a specific token at this position but found something else |
| [VF3101](desugarer.md#vf3101) | UndefinedListElement | Error | The list contains an undefined element at the specified position |
| [VF4001](typechecker.md#vf4001) | TypeMismatch | Error | The type of an expression does not match what was expected |
| [VF4002](typechecker.md#vf4002) | ArgumentTypeMismatch | Error | The type of an argument passed to a function does not match the expected parameter type |
| [VF4003](typechecker.md#vf4003) | ReturnTypeMismatch | Error | The type of the value returned by a function does not match its declared return type |
| [VF4004](typechecker.md#vf4004) | BranchTypeMismatch | Error | All branches of a match expression must return values of the same type |
| [VF4005](typechecker.md#vf4005) | IfBranchTypeMismatch | Error | The then-branch and else-branch of an if expression must have the same type |
| [VF4006](typechecker.md#vf4006) | ListElementMismatch | Error | All elements in a list must have the same type |
| [VF4007](typechecker.md#vf4007) | TupleElementMismatch | Error | The type of a tuple element does not match the expected type at that position |
| [VF4008](typechecker.md#vf4008) | RecordFieldMismatch | Error | The type of a record field does not match the expected type for that field |
| [VF4009](typechecker.md#vf4009) | NumericTypeMismatch | Error | Int and Float are distinct types in Vibefun |
| [VF4010](typechecker.md#vf4010) | OperatorTypeMismatch | Error | The operator cannot be applied to the given types |
| [VF4011](typechecker.md#vf4011) | GuardTypeMismatch | Error | Pattern guards (the `when` clause in match expressions) must evaluate to a Bool value |
| [VF4012](typechecker.md#vf4012) | AnnotationMismatch | Error | The declared type annotation does not match what the type checker inferred from the expression |
| [VF4013](typechecker.md#vf4013) | NotAFunction | Error | You tried to call something that is not a function |
| [VF4014](typechecker.md#vf4014) | NotARecord | Error | You tried to access a field on a value that is not a record |
| [VF4015](typechecker.md#vf4015) | NotARef | Error | You tried to dereference or assign to a value that is not a Ref |
| [VF4016](typechecker.md#vf4016) | RefAssignmentMismatch | Error | You tried to assign a value to a Ref, but the value's type does not match the Ref's inner type |
| [VF4017](typechecker.md#vf4017) | NotImplemented | Error | This feature has not yet been implemented in the type checker |
| [VF4020](typechecker.md#vf4020) | CannotUnify | Error | Type unification failed because the two types have incompatible structures |
| [VF4021](typechecker.md#vf4021) | FunctionArityMismatch | Error | Two function types cannot be unified because they have different numbers of parameters |
| [VF4022](typechecker.md#vf4022) | TypeApplicationArityMismatch | Error | Two type applications cannot be unified because they have different numbers of type arguments |
| [VF4023](typechecker.md#vf4023) | UnionArityMismatch | Error | Two union types cannot be unified because they have different numbers of member types |
| [VF4024](typechecker.md#vf4024) | IncompatibleTypes | Error | The types have fundamentally incompatible structures (e |
| [VF4025](typechecker.md#vf4025) | VariantUnificationError | Error | Two variant types cannot be unified because they have different constructors |
| [VF4026](typechecker.md#vf4026) | TupleArityMismatch | Error | Two tuple types cannot be unified because they have different numbers of elements |
| [VF4100](typechecker.md#vf4100) | UndefinedVariable | Error | The variable has not been defined in the current scope |
| [VF4101](typechecker.md#vf4101) | UndefinedType | Error | The type has not been defined |
| [VF4102](typechecker.md#vf4102) | UndefinedConstructor | Error | The constructor has not been defined |
| [VF4103](typechecker.md#vf4103) | UndefinedField | Error | The record does not have a field with this name |
| [VF4200](typechecker.md#vf4200) | ConstructorArity | Error | The constructor was called with the wrong number of arguments |
| [VF4201](typechecker.md#vf4201) | NoMatchingOverload | Error | No overload of this function matches the provided arguments |
| [VF4202](typechecker.md#vf4202) | WrongArgumentCount | Error | The function was called with the wrong number of arguments |
| [VF4203](typechecker.md#vf4203) | TupleArity | Error | The tuple has the wrong number of elements |
| [VF4204](typechecker.md#vf4204) | TypeArgumentCount | Error | The type constructor was applied to the wrong number of type arguments |
| [VF4205](typechecker.md#vf4205) | AmbiguousOverload | Error | Multiple overloads of the function could apply to the given arguments |
| [VF4300](typechecker.md#vf4300) | InfiniteType | Error | The type checker detected an attempt to create an infinite type |
| [VF4301](typechecker.md#vf4301) | RecursiveAlias | Error | Type aliases cannot be recursive |
| [VF4400](typechecker.md#vf4400) | NonExhaustiveMatch | Error | The match expression does not cover all possible cases |
| [VF4401](typechecker.md#vf4401) | InvalidGuard | Error | The pattern guard expression is not valid |
| [VF4402](typechecker.md#vf4402) | DuplicateBinding | Error | The same variable name appears multiple times in the same pattern |
| [VF4403](typechecker.md#vf4403) | OrPatternBindingMismatch | Error | When using or-patterns (|), all alternatives must bind exactly the same variable names with the same types, since the body can use any of them |
| [VF4404](typechecker.md#vf4404) | EmptyMatch | Error | A match expression must have at least one case to handle |
| [VF4500](typechecker.md#vf4500) | NonRecordAccess | Error | You tried to access a field using dot notation, but the value is not a record |
| [VF4501](typechecker.md#vf4501) | MissingRecordField | Error | The record does not have a field with this name |
| [VF4502](typechecker.md#vf4502) | DuplicateRecordField | Error | The same field name appears multiple times in the record |
| [VF4600](typechecker.md#vf4600) | UnknownConstructor | Error | The constructor name is not part of the expected variant type |
| [VF4601](typechecker.md#vf4601) | ConstructorArgMismatch | Error | The type of the argument passed to a constructor does not match the expected type |
| [VF4602](typechecker.md#vf4602) | VariantMismatch | Error | The variant type does not match what was expected |
| [VF4700](typechecker.md#vf4700) | ValueRestriction | Error | The value restriction prevents generalizing type variables in certain expressions |
| [VF4701](typechecker.md#vf4701) | TypeEscape | Error | A type variable that should be local to an expression would escape to an outer scope |
| [VF4800](typechecker.md#vf4800) | FFIError | Error | An error occurred with an external (FFI) declaration |
| [VF4801](typechecker.md#vf4801) | FFIInconsistentName | Error | When declaring overloads for an external function, all overloads must use the same JavaScript name in the = "name" part |
| [VF4802](typechecker.md#vf4802) | FFIInconsistentImport | Error | When declaring overloads for an external function, all overloads must import from the same module (or all have no import) |
| [VF4803](typechecker.md#vf4803) | FFINotFunction | Error | External declarations can only be overloaded if they have function types |
| [VF4804](typechecker.md#vf4804) | FFIOverloadNotSupported | Error | Overloaded external functions cannot be used as first-class values or in certain contexts |
| [VF4900](typechecker.md#vf4900) | UnreachablePattern | Warning | This pattern case will never be reached because previous patterns already cover all possible values |
| [VF5000](modules.md#vf5000) | ModuleNotFound | Error | The import statement references a module that could not be found |
| [VF5001](modules.md#vf5001) | ImportNotExported | Error | The import statement tries to import a name that is not exported from the target module |
| [VF5002](modules.md#vf5002) | DuplicateImport | Error | The same name is imported multiple times |
| [VF5003](modules.md#vf5003) | ImportShadowed | Error | An import is shadowed by a local declaration with the same name |
| [VF5004](modules.md#vf5004) | SelfImport | Error | A module is importing itself, either directly or via a path that resolves to the same file |
| [VF5005](modules.md#vf5005) | EntryPointNotFound | Error | The specified entry point file could not be found |
| [VF5100](modules.md#vf5100) | DuplicateExport | Error | The same name is exported multiple times from this module |
| [VF5101](modules.md#vf5101) | ReexportConflict | Error | A re-export statement introduces a name that conflicts with an existing export |
| [VF5102](typechecker.md#vf5102) | DuplicateDeclaration | Error | The same name is declared multiple times |
| [VF5900](modules.md#vf5900) | CircularDependency | Warning | A circular dependency was detected between modules |
| [VF5901](modules.md#vf5901) | CaseSensitivityMismatch | Warning | The module path casing doesn't match the actual file name on disk |

## Errors by Phase

### [Lexer](lexer.md) (14 errors)

Errors during lexical analysis (tokenization)

### [Parser](parser.md) (37 errors)

Errors during syntax parsing (AST construction)

### [Desugarer](desugarer.md) (1 errors)

Errors during desugaring (syntax transformation)

### [Type Checker](typechecker.md) (55 errors, 1 warnings)

Errors during type checking and inference

### [Module System](modules.md) (8 errors, 2 warnings)

Errors during module resolution and import/export handling

## Statistics

- **Total diagnostic codes:** 118
- **Errors:** 115
- **Warnings:** 3
