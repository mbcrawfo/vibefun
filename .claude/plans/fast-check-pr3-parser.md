# PR 3 — Surface AST + Parser Property Tests

Refer to `fast-check-master.md` for the shared rules.

## Context

The parser is the largest single test surface in the compiler — ~44 test
files spanning expressions, declarations, types, patterns, lambda forms, and
edge cases (deep nesting, trailing commas, unicode, etc.). Each file today
exercises a small set of fixed examples; together they form a comprehensive
regression suite, but cross-cutting properties (round-trip, determinism,
structural invariants) are absent. The leverage from a single
parse/pretty-print round-trip property is enormous — it fires across every
generated AST shape, not just the ones a human thought to write.

## Scope

~44 test files in `packages/core/src/parser/`. Notable categories:

- Top-level: `parser.test.ts`, `parser-errors.test.ts`,
  `parser-integration-{basic,phase4,patterns}.test.ts`.
- Expressions: `expression-{control-flow,functions,literals,lists,operators,records,unary-postfix}.test.ts`,
  `operator-edge-cases.test.ts`, `operator-sections.test.ts`.
- Declarations: `declarations.test.ts`, `lambda-{annotations,destructuring,precedence,return-type}.test.ts`.
- Types: `types.test.ts`, `tuple-types.test.ts`, `recursive-types.test.ts`,
  `external-types.test.ts`, `external-generics.test.ts`, `opaque-types.test.ts`,
  `pattern-type-annotations.test.ts`.
- Patterns: `patterns.test.ts`, `pattern-guards.test.ts`,
  `nested-or-patterns.test.ts`.
- Misc: `large-literals.test.ts`, `empty-blocks.test.ts`,
  `record-shorthand.test.ts`, `semicolon-required.test.ts`, `tuples.test.ts`,
  `unicode-edge-cases.test.ts`, `mixed-imports.test.ts`,
  `import-namespace.test.ts`, `multi-line-variants.test.ts`,
  `multiple-spreads.test.ts`, `while-loops.test.ts`, `deep-nesting.test.ts`,
  `keyword-field-names.test.ts`, `trailing-commas.test.ts`,
  `overloading.test.ts`.

**Excluded:** `packages/core/src/parser/snapshot-tests/*` (8 files) — snapshot
oracles, mark `snapshot-skip` in triage CSV.

## Baseline

PR 3's floor is whatever PR 2 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr3-baseline-coverage.json
```

## Triage step (commit 1)

Spawn an Explore subagent:

> Read every `*.test.ts` under `packages/core/src/parser/` (skip
> `snapshot-tests/`). For each, classify as `property-tests`, `fixed-only`,
> `snapshot-skip`, or `defer-bug-backlog`. For `property-tests`, name the
> specific properties (round-trip, determinism, structural invariant, etc.).
> Output `.claude/plans/triage/pr3-parser.csv`.

Note: many parser tests are testing precedence, associativity, and shape
invariants — these are **excellent** property targets. Don't be conservative
in classification; biased toward `property-tests`.

## Critical files

New arbitraries: `packages/core/src/types/test-arbitraries/ast-arb.ts`
- **Tier A** (no scope/binding constraints): for "parser does not throw" and
  determinism oracles. Free vars unrestricted, may reference unbound names.
- **Tier B** (structurally well-formed): every node has `loc`,
  pattern-bound names non-empty, type expressions non-empty. Use
  `fc.letrec` with depth caps (default 4) and a size budget so generation
  terminates.

Re-export from `packages/core/src/types/test-arbitraries/index.ts`.

Critical generator pieces:
- `exprArb({ depth })` — recursive, drives all sub-arbitraries.
- `patternArb({ depth })` — for match/let-binding patterns.
- `typeExprArb({ depth })` — for type annotations.
- `declArb({ depth })` — top-level let/type/import/external.
- `moduleArb({ depth })` — sequence of declarations.
- A pretty-printer in the same module file (or a sibling) — see "Pretty-printer
  decision" below.

## Pretty-printer decision

The strongest property — `parse(prettyPrint(ast)) ≡α parse(originalSrc)` —
needs a pretty-printer. Options:

1. **Use the existing pretty-printer if one exists.** Check
   `packages/core/src/utils/` and `packages/core/src/parser/` for any
   existing render/format function. If present, reuse it.
2. **Build a minimal pretty-printer in
   `packages/core/src/types/test-arbitraries/ast-pretty.ts`.** Sufficient to
   render any Tier B AST to source that the parser can consume. Does not need
   to match the formatter's output.
3. **Skip the pretty-print round-trip; settle for parse determinism +
   structural invariants.** Lower bar but still valuable.

The triage subagent should report which option is feasible. If option 2,
the pretty-printer file gets its own commit before any property tests use it.

## Property targets

- **Round-trip:** `parse(prettyPrint(ast))` is α-equivalent to `ast` (modulo
  fresh location offsets and any normalization the parser performs).
- **Determinism:** `parse(src)` is a function — same input, same output.
  Trivial but cheap, catches non-determinism bugs (rare but corrosive).
- **Every AST node has a Location:** for any parsed source, every node in the
  resulting AST carries a `loc` field with `file`, `line`, `column`, `offset`.
- **Pattern-bound names are non-empty strings:** for any parsed source, every
  pattern variable name is a non-empty string.
- **Operator precedence preservation:** for generated nested binary
  expressions with explicit parens, parse-then-render-then-parse produces the
  same AST shape (parens never silently disappear).
- **Trailing-comma equivalence:** for any list/tuple/record AST, rendering
  with and without trailing commas parses to the same AST.
- **Whitespace invariance for declarations:** for any parsed module, inserting
  blank lines between declarations does not change the parse.

## Out-of-scope-this-PR triage candidates

- `parser-errors.test.ts` — error-message exact-match tests. Mark `fixed-only`.
- Snapshot tests under `snapshot-tests/` — mark `snapshot-skip`.
- Fixture-driven tests that load specific `.vf` files — `fixed-only`.

## Verification

Per `fast-check-master.md`. Specific runtime concern: parser property tests
recurse through generated ASTs; cap `depth` aggressively in arbitraries (4 is
usually enough to catch precedence bugs without exploding generation time).

### Cross-layer validation gates (required before merge)

```bash
pnpm run verify        # build + check + lint + test + test:e2e + format:check
pnpm run spec:validate # spec-suite must remain at 378/378 (or current count)
```

If parser changes affect language semantics (any new admitted form,
precedence change, or syntax extension), update
`.claude/VIBEFUN_AI_CODING_GUIDE.md` and add the relevant case to
`tests/e2e/let-binding-matrix.test.ts` per the project's "AI coding guide
sync" and "let-binding matrix sync" rules in CLAUDE.md.

## Post-implementation coverage check

```bash
pnpm run test:coverage
# compare coverage/coverage-summary.json against
# .claude/plans/triage/pr3-baseline-coverage.json and confirm
# lines, statements, functions, and branches are all >= baseline
```

## Risks specific to this PR

- **AST arbitrary depth bombs.** Without size caps, `fc.letrec` explodes.
  Set `maxDepth: 4` in the arbitrary definitions and verify generation
  terminates within 1ms for any tier-A or tier-B sample.
- **Pretty-printer must be α-equivalence-preserving.** If the pretty-printer
  silently renames variables or normalizes type annotations, the round-trip
  property may pass for the wrong reason. Add meta-tests asserting the
  pretty-printer is the identity on simple cases (e.g. `let x = 1` round-trips
  to itself char-for-char modulo whitespace).
- **Parser determinism failures are usually a red flag** — if `parse(src)` is
  non-deterministic, some hash-table iteration is leaking into the output.
  Treat as Tier 2.
