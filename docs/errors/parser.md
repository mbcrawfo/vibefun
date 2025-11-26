<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Parser Errors

Errors during syntax parsing (AST construction)

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF2000](#vf2000) | ExpectedDeclarationKeyword | **Error** |
| [VF2001](#vf2001) | UnexpectedKeyword | **Error** |
| [VF2002](#vf2002) | ExpectedEquals | **Error** |
| [VF2003](#vf2003) | MutableBindingMustUseRef | **Error** |
| [VF2004](#vf2004) | MutableBindingMustUseSimplePattern | **Error** |
| [VF2005](#vf2005) | AndRequiresLetRec | **Error** |
| [VF2006](#vf2006) | ExpectedConstructorInVariant | **Error** |
| [VF2007](#vf2007) | ExpectedSemicolonInExternalBlock | **Error** |
| [VF2100](#vf2100) | ExpectedExpression | **Error** |
| [VF2101](#vf2101) | UnexpectedToken | **Error** |
| [VF2102](#vf2102) | ExpectedClosingParen | **Error** |
| [VF2103](#vf2103) | ExpectedClosingBracket | **Error** |
| [VF2104](#vf2104) | ExpectedClosingBrace | **Error** |
| [VF2105](#vf2105) | ExpectedThen | **Error** |
| [VF2106](#vf2106) | ExpectedArrow | **Error** |
| [VF2107](#vf2107) | ExpectedStatementSeparator | **Error** |
| [VF2108](#vf2108) | EmptySpread | **Error** |
| [VF2109](#vf2109) | UnexpectedEmptyExpressionList | **Error** |
| [VF2110](#vf2110) | ExpectedCommaOrSeparator | **Error** |
| [VF2111](#vf2111) | RecordMixedSyntax | **Error** |
| [VF2112](#vf2112) | OperatorSectionNotSupported | **Error** |
| [VF2113](#vf2113) | UnexpectedReturnTypeAnnotation | **Error** |
| [VF2200](#vf2200) | ExpectedPattern | **Error** |
| [VF2201](#vf2201) | KeywordShorthandNotAllowed | **Error** |
| [VF2202](#vf2202) | TypeAnnotatedRecordShorthand | **Error** |
| [VF2300](#vf2300) | ExpectedTypeName | **Error** |
| [VF2301](#vf2301) | ExpectedTypeExpression | **Error** |
| [VF2302](#vf2302) | ExpectedTypeParameter | **Error** |
| [VF2303](#vf2303) | ExpectedClosingAngle | **Error** |
| [VF2304](#vf2304) | ExpectedColonInRecordType | **Error** |
| [VF2400](#vf2400) | ExpectedImportSpecifier | **Error** |
| [VF2401](#vf2401) | ExpectedExportSpecifier | **Error** |
| [VF2402](#vf2402) | ExpectedFromKeyword | **Error** |
| [VF2403](#vf2403) | ExpectedModulePath | **Error** |
| [VF2404](#vf2404) | ExpectedAsAfterStar | **Error** |
| [VF2500](#vf2500) | TooManyErrors | **Error** |
| [VF2501](#vf2501) | ExpectedToken | **Error** |

---

## VF2000

**ExpectedDeclarationKeyword** **Error**

### Message

> Expected declaration keyword

### Explanation

The parser expected to find a declaration keyword at this position. Top-level declarations must start with one of the declaration keywords: 'let' for value bindings, 'type' for type declarations, 'external' for FFI declarations, 'import' for imports, or 'export' for exports.

### Example

**Problem:**

```vibefun
x = 42
```

**Solution:**

```vibefun
let x = 42
```

*Added 'let' keyword to make it a valid declaration*

### Hint

> Expected 'let', 'type', 'external', 'import', or 'export'

### Related

[VF2001](parser.md#vf2001)


---

## VF2001

**UnexpectedKeyword** **Error**

### Message

> Unexpected keyword in declaration: {keyword}

### Explanation

The parser found a keyword that cannot start a declaration. Keywords like 'then', 'else', 'match', etc. are reserved for use within expressions and cannot appear at the start of a declaration.

### Example

**Problem:**

```vibefun
then x = 42
```

**Solution:**

```vibefun
let x = 42
```

*Replaced invalid keyword with 'let'*

### Hint

> This keyword cannot start a declaration. Expected 'let', 'type', 'external', or 'import'

### Related

[VF2000](parser.md#vf2000)


---

## VF2002

**ExpectedEquals** **Error**

### Message

> Expected '=' after {context}

### Explanation

A declaration requires an '=' sign to separate the pattern or name from its value or type definition. This error occurs when the '=' is missing.

### Example

**Problem:**

```vibefun
let x 42
```

**Solution:**

```vibefun
let x = 42
```

*Added missing '=' between pattern and value*

### Hint

> Add '=' followed by the value or type definition

### Related

[VF2000](parser.md#vf2000), VF2010


---

## VF2003

**MutableBindingMustUseRef** **Error**

### Message

> Mutable bindings must use ref() syntax

### Explanation

Mutable bindings in vibefun require explicit use of the ref() wrapper. This makes mutability explicit and helps reason about state changes. The 'mut' keyword marks the binding as mutable, but the value must be wrapped in ref().

### Example

**Problem:**

```vibefun
let mut counter = 0
```

**Solution:**

```vibefun
let mut counter = ref(0)
```

*Wrapped the value in ref() for mutable binding*

### Hint

> Use: let mut {name} = ref({hint})

### Related

[VF2004](parser.md#vf2004)


---

## VF2004

**MutableBindingMustUseSimplePattern** **Error**

### Message

> Mutable bindings can only use simple variable patterns

### Explanation

Mutable bindings cannot use destructuring patterns. Each mutable variable must be bound individually using a simple variable pattern. This restriction ensures clear ownership of mutable state.

### Example

**Problem:**

```vibefun
let mut { x, y } = ref(point)
```

**Solution:**

```vibefun
let mut point = ref({ x: 1, y: 2 })
```

*Used simple variable pattern instead of destructuring*

### Hint

> Destructuring patterns like { x, y } or [a, b] are not allowed with 'mut'. Use: let mut x = ref(value)

### Related

[VF2003](parser.md#vf2003)


---

## VF2005

**AndRequiresLetRec** **Error**

### Message

> The 'and' keyword can only be used with 'let rec' for mutually recursive functions

### Explanation

The 'and' keyword is used to define mutually recursive functions that reference each other. This requires the 'rec' keyword to indicate recursive bindings. Without 'rec', bindings are evaluated sequentially and cannot reference each other.

### Example

**Problem:**

```vibefun
let f = (n) => g(n) and g = (n) => f(n)
```

**Solution:**

```vibefun
let rec f = (n) => g(n) and g = (n) => f(n)
```

*Added 'rec' keyword for mutually recursive definitions*

### Hint

> Add 'rec' before the first binding: 'let rec f = ... and g = ...'


---

## VF2006

**ExpectedConstructorInVariant** **Error**

### Message

> Expected constructor in variant type

### Explanation

Variant types must be defined using constructor names (PascalCase identifiers). Each alternative in a variant type starts with a constructor name, optionally followed by type arguments in parentheses.

### Example

**Problem:**

```vibefun
type Result<t, e> = success(t) | failure(e)
```

**Solution:**

```vibefun
type Result<t, e> = Ok(t) | Err(e)
```

*Used PascalCase constructor names*

### Hint

> Variant constructors must be PascalCase identifiers like Some, None, Ok, Err


---

## VF2007

**ExpectedSemicolonInExternalBlock** **Error**

### Message

> Expected ';' after external declaration

### Explanation

When declaring multiple external bindings in a block, each declaration must be terminated with a semicolon. This is consistent with other block-style syntax.

### Example

**Problem:**

```vibefun
external {
    log: (String) -> Unit = "console.log"
    warn: (String) -> Unit = "console.warn"
}
```

**Solution:**

```vibefun
external {
    log: (String) -> Unit = "console.log";
    warn: (String) -> Unit = "console.warn";
}
```

*Added semicolons after each declaration in the block*

### Hint

> External declarations in a block must end with semicolons


---

## VF2100

**ExpectedExpression** **Error**

### Message

> Expected expression

### Explanation

The parser expected to find an expression at this position. This error occurs when encountering an unexpected token where a value, variable, operator expression, or function call was expected.

### Example

**Problem:**

```vibefun
let x = + 5
```

**Solution:**

```vibefun
let x = 1 + 5
```

*Added left operand to the binary expression*

### Hint

> Expected a value, variable, function call, or other expression

### Related

[VF2101](parser.md#vf2101), [VF2102](parser.md#vf2102)


---

## VF2101

**UnexpectedToken** **Error**

### Message

> Unexpected {tokenType}: '{value}'

### Explanation

The parser encountered a token that doesn't make sense in this context. This might be a reserved keyword used incorrectly, a misplaced operator, or some other syntax error.

### Example

**Problem:**

```vibefun
let x = then
```

**Solution:**

```vibefun
let x = 42
```

*Replaced reserved keyword 'then' with a valid expression*

### Hint

> {hint}

### Related

[VF2100](parser.md#vf2100)


---

## VF2102

**ExpectedClosingParen** **Error**

### Message

> Expected ')' after {context}

### Explanation

A closing parenthesis is missing. Every opening parenthesis '(' must have a matching closing parenthesis ')'. Check for mismatched parentheses in your expression.

### Example

**Problem:**

```vibefun
let x = (1 + 2
```

**Solution:**

```vibefun
let x = (1 + 2)
```

*Added missing closing parenthesis*

### Hint

> Add a closing parenthesis to match the opening '('

### Related

[VF2103](parser.md#vf2103), [VF2104](parser.md#vf2104)


---

## VF2103

**ExpectedClosingBracket** **Error**

### Message

> Expected ']' after {context}

### Explanation

A closing bracket is missing. Every opening bracket '[' must have a matching closing bracket ']'. This usually occurs in list literals or list patterns.

### Example

**Problem:**

```vibefun
let xs = [1, 2, 3
```

**Solution:**

```vibefun
let xs = [1, 2, 3]
```

*Added missing closing bracket*

### Hint

> Add a closing bracket to match the opening '['

### Related

[VF2102](parser.md#vf2102), [VF2104](parser.md#vf2104)


---

## VF2104

**ExpectedClosingBrace** **Error**

### Message

> Expected '}' after {context}

### Explanation

A closing brace is missing. Every opening brace '{' must have a matching closing brace '}'. This usually occurs in record literals, record types, or blocks.

### Example

**Problem:**

```vibefun
let point = { x: 1, y: 2
```

**Solution:**

```vibefun
let point = { x: 1, y: 2 }
```

*Added missing closing brace*

### Hint

> Add a closing brace to match the opening '{'

### Related

[VF2102](parser.md#vf2102), [VF2103](parser.md#vf2103)


---

## VF2105

**ExpectedThen** **Error**

### Message

> Expected 'then' after if condition

### Explanation

In vibefun, if-expressions require the 'then' keyword between the condition and the consequent branch. This is different from some languages that use braces.

### Example

**Problem:**

```vibefun
if x > 0 x else -x
```

**Solution:**

```vibefun
if x > 0 then x else -x
```

*Added 'then' keyword after the condition*

### Hint

> Add 'then' keyword: if condition then consequence else alternative


---

## VF2106

**ExpectedArrow** **Error**

### Message

> Expected '->' after {context}

### Explanation

Lambda expressions and match cases require '->' to separate the parameters or pattern from the body expression.

### Example

**Problem:**

```vibefun
let f = (x, y) x + y
```

**Solution:**

```vibefun
let f = (x, y) -> x + y
```

*Added '->' between parameters and body*

### Hint

> Add '->' to separate parameters from body


---

## VF2107

**ExpectedStatementSeparator** **Error**

### Message

> Expected ';' or newline between {context}

### Explanation

Statements in a block must be separated by semicolons or newlines. This error occurs when two statements appear on the same line without a separator.

### Example

**Problem:**

```vibefun
{ let x = 1 let y = 2; x + y }
```

**Solution:**

```vibefun
{ let x = 1; let y = 2; x + y }
```

*Added semicolon between statements*

### Hint

> Add a semicolon or newline to separate statements


---

## VF2108

**EmptySpread** **Error**

### Message

> Empty spread operator in {context}

### Explanation

The spread operator (...) cannot stand alone - it must be followed by an expression to spread. In records, use {...base} to spread a base record. In lists, use [...xs] to spread a list.

### Example

**Problem:**

```vibefun
let x = {...}
```

**Solution:**

```vibefun
let x = {...base}
```

*Added expression after spread operator*

### Hint

> The spread operator (...) must be followed by an expression


---

## VF2109

**UnexpectedEmptyExpressionList** **Error**

### Message

> Unexpected empty expression list

### Explanation

The parser expected to find at least one expression in this context, but found an empty list instead.

### Example

**Problem:**

```vibefun
let x = ()
```

**Solution:**

```vibefun
let x = (1, 2)
```

*Added expressions to the tuple*

### Hint

> This context requires at least one expression


---

## VF2110

**ExpectedCommaOrSeparator** **Error**

### Message

> Expected ',' or '{expected}' after {context}

### Explanation

Items in a list, tuple, record, or function call must be separated by commas. This error occurs when two items appear without a comma between them.

### Example

**Problem:**

```vibefun
let xs = [1 2 3]
```

**Solution:**

```vibefun
let xs = [1, 2, 3]
```

*Added commas between list elements*

### Hint

> Add a comma to separate items or close the {context}


---

## VF2111

**RecordMixedSyntax** **Error**

### Message

> Cannot mix field assignments and shorthand in record without comma

### Explanation

Record literals can use shorthand syntax (just the field name when the variable has the same name) or explicit syntax (field: value), but all fields must be separated by commas.

### Example

**Problem:**

```vibefun
{ x: 1 name }
```

**Solution:**

```vibefun
{ x: 1, name }
```

*Added comma between fields*

### Hint

> Separate record fields with commas: { field1: value1, field2 }


---

## VF2112

**OperatorSectionNotSupported** **Error**

### Message

> Operator sections are not supported

### Explanation

Operator sections (like (+) or (+ 1)) from Haskell are not supported in vibefun. Use a lambda expression instead to create a function from an operator.

### Example

**Problem:**

```vibefun
(+)
```

**Solution:**

```vibefun
(x, y) -> x + y
```

*Used lambda instead of operator section*

### Hint

> {hint}


---

## VF2113

**UnexpectedReturnTypeAnnotation** **Error**

### Message

> Unexpected return type annotation

### Explanation

A return type annotation (: Type) was found without a corresponding lambda (=>). Return type annotations can only be used on lambda expressions.

### Example

**Problem:**

```vibefun
(): Int
```

**Solution:**

```vibefun
(): Int => 42
```

*Added lambda body after return type*

### Hint

> Return type annotations are only valid for lambda expressions. Expected '=>' after type


---

## VF2200

**ExpectedPattern** **Error**

### Message

> Expected pattern

### Explanation

The parser expected to find a pattern at this position. Patterns are used in let bindings, match expressions, and function parameters to destructure values and bind variables.

### Example

**Problem:**

```vibefun
let = 42
```

**Solution:**

```vibefun
let x = 42
```

*Added variable pattern to bind the value*

### Hint

> Expected a pattern (variable, wildcard, literal, constructor, record, or list)

### Related

[VF2201](parser.md#vf2201), [VF2202](parser.md#vf2202)


---

## VF2201

**KeywordShorthandNotAllowed** **Error**

### Message

> Cannot use keyword '{keyword}' in field shorthand

### Explanation

Keywords cannot be used with field shorthand syntax in patterns because they would conflict with their reserved meaning. Use the explicit colon syntax instead.

### Example

**Problem:**

```vibefun
let { type } = obj
```

**Solution:**

```vibefun
let { type: t } = obj
```

*Used explicit syntax to rename the field*

### Hint

> Use explicit syntax: { {keyword}: pattern }


---

## VF2202

**TypeAnnotatedRecordShorthand** **Error**

### Message

> Type-annotated record shorthand must use variable pattern

### Explanation

When using type annotations in record pattern shorthand, the inner pattern must be a simple variable pattern. Complex patterns cannot be used with this shorthand.

### Example

**Problem:**

```vibefun
let { ((x, y): Point) } = obj
```

**Solution:**

```vibefun
let { (point: Point) } = obj
```

*Used simple variable pattern with type annotation*

### Hint

> Expected (fieldName: Type)


---

## VF2300

**ExpectedTypeName** **Error**

### Message

> Expected type name

### Explanation

The parser expected to find a type name at this position. Type names are identifiers like Int, String, List<T>, or user-defined types.

### Example

**Problem:**

```vibefun
type = Int
```

**Solution:**

```vibefun
type Point = Int
```

*Added type name 'Point'*

### Hint

> Expected a type identifier (e.g., Int, String, Option<T>)


---

## VF2301

**ExpectedTypeExpression** **Error**

### Message

> Expected type expression

### Explanation

The parser expected to find a type expression at this position. This could be a type variable (lowercase like 't'), type constant (PascalCase like 'Int'), function type (T -> U), record type ({ x: Int }), or parenthesized type.

### Example

**Problem:**

```vibefun
type Point = { x: }
```

**Solution:**

```vibefun
type Point = { x: Int }
```

*Added type expression after the colon*

### Hint

> Expected a type (variable, constant, function type, record type, or parenthesized type)

### Related

[VF2300](parser.md#vf2300)


---

## VF2302

**ExpectedTypeParameter** **Error**

### Message

> Expected type parameter

### Explanation

Type parameter lists (in angle brackets) must contain valid identifiers. Type parameters are typically single letters like T, U, V or descriptive names like elem, key.

### Example

**Problem:**

```vibefun
type Box<<T>> = { value: T }
```

**Solution:**

```vibefun
type Box<T> = { value: T }
```

*Fixed malformed type parameter syntax*

### Hint

> Type parameters must be identifiers (e.g., T, a, elem)


---

## VF2303

**ExpectedClosingAngle** **Error**

### Message

> Expected '>' after type {context}

### Explanation

Type parameter lists (<T, U>) and type argument lists (List<Int>) must be closed with '>'. This error occurs when the closing angle bracket is missing.

### Example

**Problem:**

```vibefun
type Box<T = { value: T }
```

**Solution:**

```vibefun
type Box<T> = { value: T }
```

*Added closing '>' after type parameter*

### Hint

> Add '>' to close the type parameter or argument list


---

## VF2304

**ExpectedColonInRecordType** **Error**

### Message

> Expected ':' after field name in record type

### Explanation

In record type definitions, each field must have a type annotation with the syntax 'fieldName: Type'. Unlike record expressions, shorthand is not allowed in types.

### Example

**Problem:**

```vibefun
type Point = { x y: Int }
```

**Solution:**

```vibefun
type Point = { x: Int, y: Int }
```

*Added colon and type for each field*

### Hint

> Record type fields require the syntax: { fieldName: Type }


---

## VF2400

**ExpectedImportSpecifier** **Error**

### Message

> Expected '{' or '*' after 'import'

### Explanation

Import declarations must specify what to import using either named imports (with braces) or namespace imports (with *). Bare imports are not supported.

### Example

**Problem:**

```vibefun
import foo from "module"
```

**Solution:**

```vibefun
import { foo } from "module"
```

*Used named import syntax with braces*

### Hint

> Use: import { name } from "module" or import * as Name from "module"

### Related

[VF2401](parser.md#vf2401), [VF2402](parser.md#vf2402)


---

## VF2401

**ExpectedExportSpecifier** **Error**

### Message

> Expected '{' or '*' after 'export'

### Explanation

Re-export declarations must specify what to export using either named exports (with braces) or namespace exports (with *).

### Example

**Problem:**

```vibefun
export foo from "module"
```

**Solution:**

```vibefun
export { foo } from "module"
```

*Used named export syntax with braces*

### Hint

> Use: export { name } from "module" or export * from "module"

### Related

[VF2400](parser.md#vf2400), [VF2402](parser.md#vf2402)


---

## VF2402

**ExpectedFromKeyword** **Error**

### Message

> Expected 'from' keyword

### Explanation

Import and re-export declarations require the 'from' keyword followed by the module path as a string literal.

### Example

**Problem:**

```vibefun
import { foo } "module"
```

**Solution:**

```vibefun
import { foo } from "module"
```

*Added 'from' keyword before module path*

### Hint

> Add "from" followed by the module path: from "module-path"

### Related

[VF2400](parser.md#vf2400), [VF2403](parser.md#vf2403)


---

## VF2403

**ExpectedModulePath** **Error**

### Message

> Expected module path string

### Explanation

The 'from' keyword must be followed by a string literal containing the module path. Module paths can be relative (starting with ./ or ../) or package names.

### Example

**Problem:**

```vibefun
import { foo } from module
```

**Solution:**

```vibefun
import { foo } from "./module"
```

*Used string literal for module path*

### Hint

> Provide the module path as a string: from "path/to/module"

### Related

[VF2402](parser.md#vf2402)


---

## VF2404

**ExpectedAsAfterStar** **Error**

### Message

> Expected 'as' after '*'

### Explanation

When using namespace imports (import *), you must provide an alias using 'as'. This alias becomes the namespace through which all exports are accessed.

### Example

**Problem:**

```vibefun
import * from "module"
```

**Solution:**

```vibefun
import * as Module from "module"
```

*Added 'as Module' to provide namespace alias*

### Hint

> Namespace imports require an alias: import * as Name from "module"

### Related

[VF2400](parser.md#vf2400)


---

## VF2500

**TooManyErrors** **Error**

### Message

> Too many parse errors ({count}). Stopping.

### Explanation

The parser encountered too many errors and stopped. Fix the earlier errors first - they often cause cascading errors later in the file.

### Example

**Problem:**

```vibefun
let x =
let y =
let z =
```

**Solution:**

```vibefun
let x = 1
let y = 2
let z = 3
```

*Fixed multiple incomplete declarations*


---

## VF2501

**ExpectedToken** **Error**

### Message

> Expected {expected}, but found {actual}

### Explanation

The parser expected a specific token at this position but found something else. This is a general syntax error that can occur in various contexts.

### Example

**Problem:**

```vibefun
let x 42
```

**Solution:**

```vibefun
let x = 42
```

*Added the expected '=' token*

