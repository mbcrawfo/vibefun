# Feature Audit: Records and Subtyping

**Spec files**: 03-type-system/record-types.md, 03-type-system/subtyping.md
**Date**: 2026-03-26

## Results

### Record Type Definition

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Named record type definition | record-types.md "Type Definition" | positive | PASS | `type Person = { name: String, age: Int }` works; record can be constructed and fields accessed |
| 2 | Record construction (no annotation) | record-types.md "Construction" | positive | PASS | `let p = { name: "Bob", age: 25 }` compiles and runs correctly |
| 3 | Record with explicit type annotation (alias) | record-types.md "Construction" | positive | **FAIL** | `let p: Person = { name: "Charlie", age: 40 }` fails with "Cannot unify types: { name: String, age: Int } with Person". Named type alias not resolved during unification |
| 3b | Record with inline type annotation | record-types.md "Construction" | positive | PASS | `let p: { name: String, age: Int } = { ... }` works fine; only the alias name causes failure |

### Field Access

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4 | Dot notation field access | record-types.md "Field Access" | positive | PASS | `p.name` and `p.age` work correctly |
| 5 | Chained field access on nested records | record-types.md "Field Access" | positive | PASS | `p.address.city` works correctly |
| 5b | Multi-field access at top level | record-types.md "Field Access" | positive | PASS | `let a = p.x; let b = p.y;` works at top level |
| 5c | Multi-field access in function body | record-types.md "Field Access" | positive | **FAIL** | `(p) => p.x ... p.y` fails with "Field 'y' not found in record type". After first field access, the type is narrowed to only that field. Cannot access two different fields of the same function parameter. This is true both with and without annotations |

### Record Update (Spread)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | Immutable update `{ ...p, age: 31 }` | record-types.md "Update (Immutable)" | positive | PASS | Updated field reflected, new record created |
| 7 | Update preserving other fields | record-types.md "Update (Immutable)" | positive | PASS | `{ ...p, age: 31 }` preserves `name` and `email`; original record unchanged |

### Record Shorthand

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 8 | Field shorthand `{ name, age }` | record-types.md "Field Shorthand" | positive | PASS | `let name = "Alice"; let p = { name, age: 30 }` works |
| 8b | Mixed shorthand and explicit fields | record-types.md "Field Shorthand" | positive | PASS | `let user = { name, age: 25, active: true }` works |

### Width Subtyping

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 9 | Extra fields accepted at call site | subtyping.md "Record Width Subtyping" | positive | PASS | Passing `{ name, age, email }` where `{ name, age }` expected works |
| 10 | Function accepting fewer fields than provided | subtyping.md "When Width Subtyping DOES Work" | positive | PASS | `(p: { x: Int }) => p.x` accepts `{ x: 1, y: 2 }` and `{ x: 5, y: 10, z: 15 }` |
| 10b | Width subtyping in pattern match | record-types.md "Pattern matching and width subtyping" | positive | PASS | `{ x: 3, y: 4, z: 5 }` matched against `{ x, y }` pattern, z ignored |

### Keyword Fields

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 11 | Keywords as field names in construction | record-types.md "Keywords as Field Names" | positive | PASS | `{ type: "Import", import: "./module" }` compiles and runs |
| 12 | Keyword field access | record-types.md "Keywords as Field Names" | positive | PASS | `node.type` returns correct value |
| 13 | Keyword field in pattern matching | record-types.md "Keywords as Field Names" | positive | PASS | `| { type: t, value: v } => ...` works correctly |
| 13b | Keyword fields in type definition (inline) | record-types.md "Keywords as Field Names" | positive | PASS | `type ASTNode = { type: String, import: String }` works on single line |
| 13c | Keyword fields in type definition (multiline) | record-types.md "Keywords as Field Names" | positive | **FAIL** | Multi-line `type ASTNode = {\n    type: String,\n    ...` fails with "Expected field name in record type, but found NEWLINE" |
| 13d | Record update with keyword field | record-types.md "Record updates with keywords" | positive | PASS | `{ ...node, type: "Export" }` works correctly |

### Structural Typing

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 14 | Structurally equivalent types interchangeable | record-types.md "Structural Typing" | positive | PASS | Records with same fields usable with function expecting that shape |
| 15 | Field order doesn't matter | subtyping.md "Example 3: Order doesn't matter" | positive | PASS | `{ y: 20, x: 10 }` accepted where `{ x: Int, y: Int }` expected |

### Trailing Comma

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | Trailing comma allowed | record-types.md "Trailing comma allowed" | positive | PASS | `{ name: "Alice", age: 30, }` compiles and runs |

### Negative Tests

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 17 | Missing required field should fail | subtyping.md "Field containment" | negative | **FAIL** | `greet({ name: "Alice" })` where `{ name: String, age: Int }` expected compiles successfully. Symmetric width matching ignores extra fields in EITHER direction, so missing fields are not detected even when the annotation declares them. Causes runtime `undefined` if the missing field is accessed |
| 18 | Wrong field type should fail | subtyping.md "Field compatibility" | negative | **FAIL** | `{ name: "Alice", age: "thirty" }` where `age: Int` expected compiles if `age` is not used in the function body. The type annotation constraint is not enforced for fields that aren't accessed. When `age` IS used, the error is caught (test 18d) |
| 19 | Keyword shorthand `{ type }` should fail | record-types.md "Shorthand limitation" | negative | PASS | Correctly rejects `let type = "User"` as "Expected pattern" since `type` is a keyword |
| 20 | Accessing non-existent field should fail | record-types.md "Field Access" | negative | PASS | Correctly rejects `p.email` on `{ name, age }` with "Field 'email' not found" |

### Subtyping: Function Variance

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21 | Function type assignment rejects variance | subtyping.md "Function Type Variance" | negative | **FAIL** | `let g: ({ x: Int }) -> Int = f` where `f: ({ x: Int, y: Int }) -> Int` compiles successfully. Spec says "function types must unify exactly" but symmetric matching allows this |

### Subtyping: Inference

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 22 | Inferred minimum fields | subtyping.md "When Inference Just Works" | positive | PASS | `let getX = (p) => p.x` accepts both `{ x: 42 }` and `{ x: 99, y: 100 }` |

### Additional Findings

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 23 | Record pattern matching at top level | record-types.md "Pattern matching" | positive | PASS | `match p { \| { x: 0, y: 0 } => "origin" \| { x, y } => ... }` works at top level |
| 24 | Nested record construction | record-types.md "Construction" | positive | PASS | `{ name: "Alice", address: { street: "...", city: "NYC" } }` and chained access works |
| 25 | Multi-line record type definition | record-types.md "Multi-line with commas" | positive | **FAIL** | Record type definitions must be single-line. The parser rejects newline after `{` in type context, though record expressions support multi-line |

## Summary

- **Total: 28 tests**
- **Pass: 21**
- **Fail: 7**

### Critical Failures

1. **Multi-field access in function parameters (test 5c)**: Cannot access more than one field of a record function parameter. After the first `.field` access, the parameter's type is narrowed to only contain that field. This makes it impossible to write functions that use multiple record fields via dot notation. **Workaround**: Use pattern matching to destructure at top level, or bind the record to a top-level variable first.

2. **Named type alias in let annotation (test 3)**: `let p: Person = { ... }` fails because the type alias `Person` is not resolved to its structural definition during unification. Inline annotations `let p: { name: String, age: Int }` work fine.

3. **Missing field not detected (test 17)**: Due to symmetric width matching, calling a function with a record missing required fields compiles successfully. This can cause runtime `undefined` errors when the function body accesses the missing field.

4. **Wrong field type not detected when unused (test 18)**: Type annotations on function parameters are not fully enforced -- only fields that are actually accessed in the body have their types checked.

5. **Function type variance not enforced (test 21)**: The spec states function types must unify exactly (no variance), but symmetric width matching in practice allows function type assignments where the record parameter types differ in their number of fields.

6. **Multi-line record type definitions (test 25)**: The spec shows multi-line record type syntax, but the parser rejects newlines after `{` in type definition context (record expressions handle multi-line fine).
