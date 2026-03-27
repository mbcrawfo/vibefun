# Feature Audit: JavaScript Interop and Modules

**Spec files**: `10-javascript-interop/*.md`, `08-modules.md`
**Date**: 2026-03-26
**Test directory**: `/tmp/vf-audit-interop/`

## Results

### External Declarations

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Single external declaration | `external-declarations.md` (Single External Declarations) | positive | PASS | `external console_log: (String) -> Unit = "console.log";` compiles and runs correctly |
| 2 | External block with multiple declarations | `external-declarations.md` (External Blocks) | positive | PASS | `external { log: ...; error: ...; };` compiles and both bindings work |
| 3 | External with different JS name | `external-declarations.md` (Single External Declarations) | positive | PASS | `external myLog: (String) -> Unit = "console.log";` maps custom name to JS function |
| 4 | External function with multiple parameters | `external-declarations.md` (Single External Declarations) | positive | **FAIL** | `external js_parseInt: (String, Int) -> Int = "parseInt";` compiles but generates `parseInt("42")` dropping the second argument. Currying causes only the first arg to be passed to the JS function. Output correct by accident (parseInt defaults radix to 10). |
| 5 | External function with return value | `external-declarations.md` (Single External Declarations) | positive | **FAIL** | `external mathMax: (Int, Int) -> Int = "Math.max";` called as `Math.max(10)` instead of `Math.max(10, 20)`. Returns 10 instead of 20. Same multi-param currying bug as #4. |
| 23 | Export external declaration | `external-declarations.md` (Syntax Summary) | positive | PASS | `export external myLog: ...` compiles and emits `export { myLog }` in JS output |
| 27 | Overloaded external (separate names) | `external-declarations.md` (Overloaded External Functions) | positive | PASS | Two external declarations with different names for same JS function compile successfully |
| 28 | External type declaration in block | `external-declarations.md` (External Type Declarations) | positive | PASS | `type Response = { ok: Bool, status: Int };` inside external block compiles |
| 29 | Generic external declaration | `external-declarations.md` (Generic External Declarations) | positive | **FAIL** | `external identity: <T>(T) -> T = "x => x";` compiles but fails at call site with "Cannot unify T with String". Generic type parameters not instantiated. |
| 34 | External constant (non-function) | `external-declarations.md` (Single External Declarations) | positive | PASS | `external pi: Float = "Math.PI";` works, outputs `3.141592653589793` |

### External from Module

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | `external from "module" { ... }` block syntax | `external-declarations.md` (External Blocks) | positive | **FAIL** | Compiles and generates correct `import { join } from "node:path"` but `join("hello", "world")` curried to `join("hello")`, outputting `hello` instead of `hello/world`. Multi-param currying bug. |
| 24 | `external from "module"` with single-param function | `external-declarations.md` (External Blocks) | positive | PASS | `basename("/foo/bar/baz.txt")` from `node:path` works correctly, returns `baz.txt` |
| 33 | Single `external name: Type = "jsName" from "module"` | `external-declarations.md` (Single External Declarations) | positive | **FAIL** (multi-param) / PASS (single-param) | Single-param version (`dirname`) works. Multi-param version (`join`) has currying bug. |
| 33b | Single-param external from module | `external-declarations.md` (Single External Declarations) | positive | PASS | `external dirname: (String) -> String = "dirname" from "node:path"` works correctly |

### Unsafe Blocks

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 7 | Basic unsafe block | `unsafe-blocks.md` (Basic unsafe block) | positive | PASS | `let _ = unsafe { log("test") };` works |
| 8 | Unsafe block as expression returning value | `unsafe-blocks.md` (Unsafe block as expression) | positive | PASS | `let x = unsafe { js_parseInt("99", 10) };` returns value (though multi-param bug means radix dropped) |
| 9 | Unsafe block in function body | `unsafe-blocks.md` (basic) | positive | PASS | `let f = (msg) => unsafe { log(msg) };` works |
| 9b | Zero-parameter lambda with unsafe | `unsafe-blocks.md` | positive | **FAIL** | `let f = () => unsafe { log("test") };` crashes compiler with "Internal error: Lambda with zero parameters" |
| 10 | Multiple unsafe blocks in sequence | `unsafe-blocks.md` | positive | PASS | Three consecutive `let _ = unsafe { log(...) };` all execute in order |
| 11 | Multi-line unsafe block (newlines) | `unsafe-blocks.md` (Multiple FFI calls) | positive | **FAIL** | `unsafe {\n  let a = 10;\n  ...` fails with "Unexpected token: NEWLINE". Parser rejects newline after `unsafe {`. |
| 25 | Multi-statement unsafe (single line) | `unsafe-blocks.md` | positive | PASS | `unsafe { let a = 10; let b = 20; a + b }` on one line works, generates IIFE |
| 26 | Nested unsafe blocks (single line) | `unsafe-blocks.md` (Nesting Unsafe Blocks) | positive | PASS | `unsafe { let x = unsafe { log("inner") }; log("outer") }` works on single line |

### Try/Catch in Unsafe

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 14 | Try/catch inside unsafe (multi-line) | `unsafe-blocks.md` (JavaScript Syntax in Unsafe Blocks) | positive | **FAIL** | Fails because multi-line unsafe blocks are not supported (same as #11) |
| 14b | Try/catch inside unsafe (single line) | `unsafe-blocks.md` (JavaScript Syntax in Unsafe Blocks) | positive | **FAIL** | `unsafe { try { ... } catch (e) { ... } }` fails with "Unexpected keyword: 'try'". Try/catch not supported in unsafe blocks at all. |

### Safe Wrapper Pattern

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 12 | Function wrapping unsafe | `unsafe-blocks.md` (Unsafe Block Restrictions) | positive | PASS | `let safeLog = (msg) => unsafe { log(msg) };` works correctly |
| 13 | Calling safe wrapper normally | `unsafe-blocks.md` (Unsafe Block Restrictions) | positive | PASS | `safeLog("hello")` works without requiring unsafe at call site |

### Type Safety at Boundaries

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 19b | External function respects declared type (single param) | `type-safety.md` | positive | PASS | `mathAbs(-42)` returns 42 correctly |
| 19c | Type mismatch rejected | `type-safety.md` | negative | PASS | `mathAbs("not a number")` correctly rejected with "Cannot unify Int with String" |
| 20 | External called without unsafe | `unsafe-blocks.md` (Unsafe Block Restrictions) | negative | **FAIL** | `let _ = log("test");` compiles and runs successfully without `unsafe`. Spec says external calls require unsafe blocks, but compiler does not enforce this. |

### Calling Conventions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21 | Multi-param external currying | `calling-conventions.md` | positive | **FAIL** | `mathPow(5, 2)` generates `Math.pow(5)` returning NaN. All multi-parameter external functions lose arguments after the first due to currying. |

### Module System

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 15 | Export declaration | `08-modules.md` (Exports) | positive | PASS | `export let x = 42;` compiles and generates `export { x }` in JS |
| 16 | Export type (record) | `08-modules.md` (Exports) | positive | PASS | `export type Point = { x: Int, y: Int };` compiles (types erased in output) |
| 17 | Import from relative path (using imported names) | `08-modules.md` (Imports) | positive | **FAIL** | Import syntax is parsed and emitted as JS import, but imported names are not available in type-checking. `greetMsg` is "Undefined variable" at compile time. |
| 17b | Import syntax parsing (not using names) | `08-modules.md` (Imports) | positive | PASS | `import { greetMsg } from "./test17_helper";` parses and generates correct JS import. Works at runtime if imported names aren't used in .vf code. |
| 18 | Namespace import (using qualified names) | `08-modules.md` (Imports) | positive | **FAIL** | `import * as M from "./test18_helper";` parsed but `M.magicNum` fails with "Undefined variable 'M'". Namespace bindings not resolved. |
| 18b | Namespace import codegen | `08-modules.md` (Imports) | positive | **FAIL** | Generates invalid JS: `import { * as M } from "..."` instead of `import * as M from "..."`. Runtime SyntaxError. |
| 30 | Import type (type-only) | `08-modules.md` (Imports) | positive | PASS | `import type { SomeType } from "./test17_helper";` parses and type import is correctly erased from output |
| 31 | Re-export | `08-modules.md` (Re-exports) | positive | **FAIL** | `export { greetMsg } from "./test17_helper";` crashes compiler with "Internal error: Unknown declaration kind: ReExportDecl" |
| 32 | Wildcard re-export | `08-modules.md` (Re-exports) | positive | **FAIL** | `export * from "./test17_helper";` crashes compiler with same "Unknown declaration kind: ReExportDecl" |

## Summary

- **Total**: 32 tests
- **Pass**: 18
- **Fail**: 14

### Critical Issues

1. **Multi-parameter external functions lose arguments (tests 4, 5, 6, 21, 33)**: All external functions declared with 2+ parameters only receive the first argument when called. The compiler's auto-currying generates `fn(arg1)` instead of `fn(arg1, arg2)`. This is the most impactful bug -- it makes most JavaScript interop with multi-arg functions silently wrong.

2. **Multi-line unsafe blocks rejected (tests 11, 14)**: The parser rejects newlines after `unsafe {`. Only single-line `unsafe { expr }` works. The spec documents multi-statement unsafe blocks across multiple lines.

3. **Try/catch not supported in unsafe blocks (test 14b)**: The spec explicitly shows try/catch as allowed in unsafe blocks, but `try` is rejected as unexpected keyword. This blocks the safe wrapper pattern with error handling.

4. **Imported names not available at compile time (tests 17, 18)**: Import syntax parses and generates correct JS imports, but imported names are not bound in the type-checker. This makes cross-module imports unusable for anything other than side-effect imports.

5. **Namespace import generates invalid JS (test 18b)**: `import * as M` is emitted as `import { * as M }` which is a JavaScript syntax error.

6. **Re-exports crash the compiler (tests 31, 32)**: Both named re-exports and wildcard re-exports cause an internal error "Unknown declaration kind: ReExportDecl".

7. **Generic external declarations fail (test 29)**: Type parameter `T` is not instantiated at call sites, causing "Cannot unify T with String" errors.

8. **Zero-parameter lambdas crash compiler (test 9b)**: `() => expr` causes "Internal error: Lambda with zero parameters". Unit-parameter functions like thunks cannot be defined.

9. **External calls not required to be in unsafe blocks (test 20)**: The spec mandates that external function calls must be inside `unsafe` blocks, but the compiler allows calling externals directly without `unsafe`.

### Working Features

- Single external declarations (single-param functions and constants)
- External blocks with multiple declarations
- External blocks with `from "module"` (single-param functions)
- Single-param external `from "module"` declarations
- Basic unsafe blocks (single expression, single line)
- Safe wrapper pattern (wrapping unsafe in a function)
- Export declarations (`export let`, `export type`)
- Export external declarations
- Type checking at FFI boundaries (argument type mismatch detected)
- Import syntax parsing and JS codegen (named imports, type-only imports)
- External type declarations in blocks
- External constants (non-function values)
- Overloaded external declarations (separate names)
