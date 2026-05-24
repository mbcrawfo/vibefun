# VF-FC-0005 — Mutable-binding reassignment `x = expr;`

**Tier:** 3 (spec/impl divergence) · **Phase:** 4 (#11) · **Status:** Open · after VF-FC-0002

## Context

A documented spec example fails to compile:

```vibefun
let mut x = ref(0);
x = ref(10);          // error[VF2107]: Expected ';' or newline between declarations
```

Spec `docs/spec/07-mutable-references.md:54-82` allows reassigning a `let mut` binding to a new
value ("Less common, but allowed") — distinct from `:=`, which mutates a ref's *contents*.
Reassignment rebinds the variable itself. **Decision (owner):** reassignment is a **statement
returning `Unit`**, mirroring `:=`.

## Root cause

The parser has no surface rule for `<ident> = <expr>` as a reassignment statement; `=` after a
previously-bound name is rejected as a stray declaration (`VF2107`), both at top level and inside
blocks. Only `:=` is accepted.

## TDD plan

### Red — failing test first
Flip the bug-pinned test in `tests/e2e/spec-validation/07-mutable-references.test.ts` from
`expectCompileError(...)` to `expectRunOutput(<spec example>, "10")` (the spec's "reassign the
binding to a new ref" example). Run; confirm `VF2107`.

### Green — the fix (full pipeline)
- **AST** (`packages/core/src/types/ast.ts`): add a surface node `Assign { target: <ident>, value, loc }`
  (distinct from the `:=` ref-assignment operator). Add the matching exhaustive-switch arms.
- **Parser** (`packages/core/src/parser/`): recognise `<ident> = <expr>` as an `Assign` statement
  at top level and inside blocks. Disambiguate from `let`-binding `=` and from `:=`.
- **Desugarer** (`packages/core/src/desugarer/`): lower to a core assignment form whose value type
  is `Unit` (add a core node or reuse the existing ref-assign lowering if it returns Unit).
- **Typechecker:** require the target to be a `mut`-bound variable (else a clear diagnostic —
  add a VF error code if none fits); result type `Unit`; the value's type must unify with the
  binding's type.
- **Codegen:** ensure `let mut x` emits a reassignable JS `let` (not `const`), and `x = …` emits
  the assignment; the expression yields `Unit`.

## Test layers (CLAUDE.md directive 5)
- **Unit:** parser (accepts `x = e`; rejects reassigning a non-mut/unbound name), desugarer
  (lowers to Unit-typed assign), typechecker (mut-only target; type match), codegen (`let` not
  `const`; assignment emitted).
- **Integration:** desugarer→typecheck→codegen for a reassignment.
- **Execution-tests:** reassignment changes observed behavior at runtime.
- **Spec-validation:** the flipped `07-mutable-references.test.ts` case; plus a negative case
  (reassigning a non-`mut` binding → compile error).
- **let-binding-matrix:** if reassignment introduces a new `let`-related path, add it to
  `tests/e2e/let-binding-matrix.test.ts`.
- **AI-guide:** in the Variables & Mutability section, document binding reassignment
  (`x = e`, rebinds the variable, requires `let mut`) vs ref-content mutation (`x := e`,
  mutates the ref). Include a `let mut x = ref(0); x = ref(10); x := 20;` example showing both.
- **Error docs:** run `pnpm docs:errors` if a new VF error code is added.

## Cross-cutting concerns
**After VF-FC-0002** — reassignment is a side effect; the optimizer must not drop it in
non-tail position. **Shares `ast.ts` + exhaustive switches with VF-FC-0012** — do 0005 first,
then 0012 rebases on the new switch arms.

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
pnpm docs:errors   # if error codes changed
```

## Backlog cleanup
Remove the VF-FC-0005 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
