# Group 12: Miscellaneous Standalone Issues

These issues don't fit into larger groups and can be fixed independently.

## Issues

### 12a: Integer Division by Zero Should Panic
- **Section:** 09-error-handling (1 test)
- **Problem:** `1 / 0` compiles to `Math.trunc(1 / 0)` producing `Infinity` instead of a runtime panic
- **Fix:** Emit a runtime check `$intDiv(a, b)` that throws when `b === 0`
- **Complexity:** Small

### 12b: String Literal Union Types Not Parseable
- **Section:** 03-type-system (1 test)
- **Problem:** Parser doesn't accept string literals in type position. `type Status = "pending" | "active"` fails.
- **Fix:** Extend parser type expression grammar to accept string literals as singleton types
- **Complexity:** Medium

### 12c: Explicit Type Parameters on Lambdas Not Parsed
- **Section:** 03-type-system (1 test)
- **Problem:** `<T>(x: T): T => x` syntax not recognized by parser
- **Fix:** Extend parser to recognize `<TypeParams>` before lambda parameter lists
- **Complexity:** Medium

### 12d: Lambda Pattern Destructuring Not Implemented
- **Section:** 06-functions (1 test)
- **Problem:** `({ x, y }: { x: Int, y: Int }) => x` rejected with "Pattern matching in lambda parameters not yet implemented"
- **Fix:** Desugar pattern params into variable + match, or add pattern inference to lambda
- **Complexity:** Medium

### 12e: Record Width Subtyping Too Permissive
- **Section:** 03-type-system (1 test)
- **Problem:** Records with missing required fields are accepted instead of rejected
- **Fix:** Ensure all expected fields exist in actual type during record unification
- **Complexity:** Small

### 12f: Unsafe Enforcement for External Calls Missing
- **Section:** 10-javascript-interop (1 test)
- **Problem:** External functions callable anywhere, not just in `unsafe` blocks
- **Fix:** Add unsafe-context tracking in typechecker, new diagnostic code
- **Complexity:** Medium

### 12g: Module Test Single-Quote Strings
- **Section:** 08-modules (all 9 tests, also in Group 10)
- **Problem:** Tests use single-quoted import paths but lexer only supports double quotes
- **Fix:** Change test strings to double quotes
- **Complexity:** Simple (test fix only)
