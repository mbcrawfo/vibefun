# Chunk 06 — Lexer-level V-layer spec-validation cases

## Context

Several lexical-structure features have unit/integration coverage but never get exercised through the **full CLI pipeline**. The spec-validation suite (`tests/e2e/spec-validation/02-lexical-structure.test.ts`) gates the contract that *valid programs using these tokens compile and run end-to-end*. This chunk closes the V-layer gaps.

Closes: 02 F-12 (V), F-29, F-32, F-33, F-34, F-37, F-38, F-39.

## Spec under test

- `docs/spec/02-lexical-structure/operators.md` — operator categories (arithmetic, logical, pipe, special, punctuation), `:=`, `!`, `&` concat, `|>`/`>>`/`<<`.
- `docs/spec/02-lexical-structure/tokens.md` — reserved keywords listed for future use.

## Pre-flight orphan check

Read `tests/e2e/spec-validation/02-lexical-structure.test.ts` first. If it already has cases for any operator family, skip duplicates and add only missing ones.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

All tests go in `tests/e2e/spec-validation/02-lexical-structure.test.ts`. Use the `expectCompiles` / `expectRunOutput` / `expectCompileError` helpers from `tests/e2e/spec-validation/helpers.ts`.

1. **F-12 reserved-keyword rejection** — for each of `trait`, `impl`, `where`, `do`, `yield` (the 5 missing per audit; existing tests cover `async`, `await`, `return`):
   ```typescript
   it("rejects 'trait' as a future-reserved keyword", () => {
       expectCompileError("let trait = 1;");
   });
   ```
2. **F-29 arithmetic operators** — single case asserting `1 + 2 - 3 * 4 / 5 % 6` compiles and runs to its expected integer value.
3. **F-32 logical operators** — `&&`, `||`, `!`:
   ```typescript
   it("recognises logical operators", () => {
       expectRunOutput(
           withOutput("let r = (true && false) || !false;", "Bool.toString(r)"),
           "true",
       );
   });
   ```
4. **F-33 string concatenation `&`** — `"a" & "b"` evaluates to `"ab"`.
5. **F-34 pipe operators** — three cases: `data |> f`, `f >> g`, `f << g`. Use simple identity/inc functions to assert behaviour.
6. **F-37 `:=` assignment** — already tested elsewhere, but add a tokenisation-focused V case:
   ```typescript
   it("recognises := for ref assignment", () => {
       expectRunOutput(
           withOutput("let r = ref(0); let _ = unsafe { r := 42 };", "Int.toString(!r)"),
           "42",
       );
   });
   ```
7. **F-38 `!` disambiguation** — two cases:
   - `!true` evaluates to `false` (logical NOT).
   - `!ref(42)` evaluates to `42` (deref).
   Both must coexist in the same chunk, demonstrating that the parser disambiguates by operand type.
8. **F-39 punctuation parens/braces/brackets** — single case constructing a tuple, a record, and a list in one program; asserts all three compile and run.

## Behavior expectations (for bug-triage)

- F-12: if a reserved keyword **doesn't** error, the parser is silently accepting future syntax — file a bug. (Note: the audit's F-CC test at `13-appendix.md` already enumerates that reserved keywords are rejected; the spec-validation case is the user-facing side of that contract.)
- F-38 `!` deref: if the program runs but returns the ref instead of the dereferenced value, the codegen for unary `!` on `Ref<T>` is wrong — file a bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify` — spec-validation is gating, so a failure breaks CI.
- `pnpm run test:coverage` ≥ baseline

## Out of scope

- Lexer-internal unit-level coverage of the same operators — chunk 05 or already covered by orphan tests.
- Pipe operator precedence/composition tests — chunk 16 (appendix).
