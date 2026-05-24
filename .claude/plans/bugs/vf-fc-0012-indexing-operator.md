# VF-FC-0012 — List indexing operator `[]` → `Option<T>`

**Tier:** 3 (operator unimplemented) · **Phase:** 4 (#12) · **Status:** Open · **LARGEST** · after VF-FC-0005

## Context

The precedence-16 `[]` list/record indexing operator (spec `docs/spec/13-appendix.md:89`) is
entirely unimplemented:

```vibefun
let xs = [10, 20, 30];
let y = xs[0];   // error[VF2107]: Expected ';' or newline
```

**Decision (owner):** `xs[i]` has type **`Option<T>`**; out-of-bounds → `None`.

**Scope:** **list indexing is the guaranteed deliverable** (`List<T>` indexed by `Int` →
`Option<T>`). **Record dynamic-key indexing is a flagged follow-up** — closed records have
heterogeneous field types and a dynamic key can't be soundly typed; literal-key `r["a"]` could
later be typed `Option<fieldType>`. **Confirm record-indexing scope before implementing it.**

## Root cause

- No `Index` AST variant in `packages/core/src/types/ast.ts`.
- The postfix loop `parseCall` (`packages/core/src/parser/parse-expression-operators.ts`) only
  consumes `LPAREN` (call) and `DOT` (record access) — never `LBRACKET`.
- The audit `.claude/spec-audit/13-appendix.md` F-33 **wrongly** marks indexing ✅ Implemented
  (citing a non-existent `Index` node and `parsePostfix` LBRACKET handling) — **must be corrected**.

## TDD plan

### Red — failing test first
Flip the `[BUG: VF-FC-0012]` test in `tests/e2e/spec-validation/04-expressions.test.ts` from
asserting `VF2107` to:
- in-bounds: `xs[0]` resolves to `Some(10)` (via a `match` printing the value);
- out-of-bounds: `xs[9]` resolves to `None`.

Run; confirm `VF2107` (parser rejects `[`).

### Green — the fix (full pipeline; mirror the `DOT` record-access flow)
- **AST:** add `Index { target, index, loc }` surface node; add exhaustive-switch arms.
- **Parser:** add an `LBRACKET <expr> RBRACKET` postfix rule in `parseCall` at precedence 16
  (alongside `LPAREN`/`DOT`); parse the index expression, expect `RBRACKET`.
- **Desugarer:** lower list indexing to the existing stdlib
  `List.get : (List<T>, Int) -> Option<T>` — **verify this signature exists**
  (`packages/stdlib/src/list.ts`); if so, reuse it (cleanest). Otherwise add a core node +
  runtime helper that returns `None` out of bounds.
- **Typechecker:** `target : List<T>`, `index : Int` ⟹ result `Option<T>`.
- **Codegen:** emit the desugared `List.get` call (or the helper).

### Spec + audit (part of green)
- **Expand** the spec — `docs/spec/13-appendix.md:89` currently only lists `[]` in the
  precedence table without defining semantics. Add a section defining `xs[i] : Option<T>`
  and out-of-bounds → `None` (in the Expressions/Collections area), cross-linked from the
  appendix entry.
- Correct `.claude/spec-audit/13-appendix.md` F-33 from ✅ to the accurate status.

## Test layers (CLAUDE.md directive 5)
- **Unit:** parser (`xs[0]` parses to `Index`; nested `xs[0][1]`; missing `]` errors),
  desugarer (lowers to `List.get`), typechecker (`List<T>`+`Int`→`Option<T>`; wrong index type
  errors), codegen (emits the call).
- **Integration:** desugar→typecheck→codegen for indexing.
- **Execution-tests:** in-bounds → `Some`, out-of-bounds → `None`.
- **Spec-validation:** the flipped `04-expressions.test.ts` cases (read + out-of-bounds).
- **Spec doc + audit correction + AI-guide:** document the indexing operator and its
  `Option<T>` semantics. AI-guide: add to the Expressions/Collections section — `xs[i]`
  returns `Option<T>`, out-of-bounds is safe (`None`), and the result must be pattern-matched;
  include a `match xs[i] { | Some(v) => … | None => … }` example.

## Cross-cutting concerns
**Last** — rebase on VF-FC-0005's `ast.ts`/exhaustive-switch additions (both add a surface node).
Benefits from VF-FC-0002 (side-effect preservation) and a stable Option/codegen path. Touches
`04-expressions.test.ts` (sequential with 0002/0003/0004).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
pnpm docs:errors   # if error codes changed
```

## Backlog cleanup
Remove the VF-FC-0012 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix; ensure the audit
correction is in the same commit.
