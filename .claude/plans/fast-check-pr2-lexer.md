# PR 2 — Token + Lexer Property Tests

Refer to `fast-check-master.md` for the shared rules (commit recipe, triage
step, subagent constraints, bug triage tiers).

## Context

The lexer is the entry point of the compiler pipeline. Bugs here cascade into
every downstream stage and are usually invisible to fixed-input tests because
hand-written examples don't probe the boundaries between token kinds (where do
identifiers stop and operators start? what about astral codepoints in string
literals? what about whitespace runs that span line counters?). Property-based
testing on tokens has exceptionally high leverage: round-trip
`lex(render(token)) === token` is a strong oracle that a single property
expresses for every token kind at once.

## Scope

~18 test files in `packages/core/src/lexer/`:

- `lexer.test.ts`, `lexer-integration-{advanced,features,realistic,syntax}.test.ts`
- `identifiers.test.ts`, `reserved-keywords.test.ts`
- `numbers-{edge-cases,formats,location}.test.ts`
- `operators-{edge-cases,invalid,multi-char,punctuation}.test.ts`
- `strings.test.ts`, `comments.test.ts`, `whitespace-tracking.test.ts`,
  `unicode-normalization.test.ts`

Plus 1 test file in `packages/core/src/types/`:
- `token.test.ts`

## Baseline

PR 2's floor is whatever PR 1 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr2-baseline-coverage.json
```

Record the four metrics; they are the floor for every commit in this PR.

## Triage step (commit 1 of PR)

Spawn an Explore subagent with this prompt:

> Read every `*.test.ts` under `packages/core/src/lexer/` and
> `packages/core/src/types/token.test.ts`. For each, decide one of:
> - `property-tests` — file tests behaviour where round-trip, idempotence, or
>   structural invariants would add value. Name the properties.
> - `fixed-only` — file tests specific regressions, exact error messages, or
>   structural cases that don't generalize. Justify briefly.
> - `snapshot-skip` — snapshot-style files excluded from this PR scope.
> - `defer-bug-backlog` — file already has a known fixed-input regression test
>   for a real bug; property version belongs in a follow-up.
>
> Output a CSV at `.claude/plans/triage/pr2-lexer.csv` with columns
> `path,disposition,justification,proposed_properties`. Do not write any test
> code.

Commit message:
```
PR 2 triage: classify lexer test files for fast-check enhancement
```

## Critical files

New arbitraries module: `packages/core/src/types/test-arbitraries/`
- `index.ts` — barrel re-export.
- `token-arb.ts` — arbitraries for each `Token` kind in
  `packages/core/src/types/token.ts`. Use `fc.oneof` for the discriminated
  union. Include:
    - `identifierArb` — generates valid identifiers (matches lexer regex).
    - `keywordArb` — picks from the reserved keyword list.
    - `intLiteralArb`, `floatLiteralArb` — numeric literals across the safe
      range (negatives, edge cases, scientific notation).
    - `stringLiteralArb` — covers escape sequences, surrogate pairs, astral
      codepoints.
    - `operatorArb`, `punctuationArb` — multi-char and single-char.
    - `tokenArb` — `fc.oneof` of all the above.
    - `tokenStreamArb` — sequence with size cap; useful for round-trip tests.
- `token-arb.test.ts` — meta-tests asserting generators are total and produce
  the expected token kinds.

Update barrel: `packages/core/src/types/test-arbitraries/index.ts` re-exports.

Both directories (`packages/stdlib/src/test-arbitraries/`,
`packages/core/src/types/test-arbitraries/`) are already covered by the
coverage exclude added in PR 1.

## Property targets

For each file marked `property-tests` in the triage CSV, candidate properties:

- **Round-trip** `lex(render(token)) === token`: the strongest oracle.
  Generate a token, render it to source, lex the source, assert one token plus
  EOF and assert structural equivalence (excluding location offsets, which are
  determined by the rendered source).
- **Token-stream round-trip:** generate a list of tokens with valid
  inter-token whitespace, render, lex, assert the resulting kinds match the
  generated kinds.
- **Whitespace invariance:** for any source `s` and any whitespace string `w`
  that doesn't span across a token, `lex(s + w + s')` produces the same kind
  sequence as `lex(s + " " + s')`.
- **Comment stripping:** for any source `s` and any line-comment text `c`,
  `lex(s + "// " + c + "\n" + s')` produces the same kind sequence as
  `lex(s + "\n" + s')`.
- **Identifier non-overlap with keywords:** for any generated identifier,
  it lexes as `IDENT`, never as a keyword (and vice versa).
- **Number format determinism:** for any safe integer `n`,
  `lex(String(n))` produces a single `INT_LITERAL` token whose value is `n`
  (modulo float/int formatting differences).
- **String literal codepoint preservation:** for any string `s`,
  `lex(JSON.stringify(s))` produces a single `STRING_LITERAL` whose value is
  `s` (covers astral codepoints and escape sequences).

## Out-of-scope-this-PR triage candidates

- Fixed-input regression tests for specific historical bugs (e.g. a particular
  multi-char operator that was once mis-tokenized): mark `fixed-only`.
- Tests that assert specific error messages: `fixed-only`.
- Snapshot-style tests (none expected in lexer, but mark
  `snapshot-skip` if found).

## Verification

Per-PR verification in `fast-check-master.md`. Specifically for PR 2: the four
coverage metrics must be ≥ the values in
`.claude/plans/triage/pr2-baseline-coverage.json` after every commit and at
PR close.

### Cross-layer validation gates (required before merge)

```bash
pnpm run verify        # build + check + lint + test + test:e2e + format:check
pnpm run spec:validate # spec-suite pass count must not decrease
```

If lexer changes affect language semantics (token shapes, escape sequences,
keyword set), update `.claude/VIBEFUN_AI_CODING_GUIDE.md` and the
let-binding matrix tests per the project's "AI coding guide sync" and
"let-binding matrix sync" rules in CLAUDE.md.

## Post-implementation coverage check

```bash
pnpm run test:coverage
# compare coverage/coverage-summary.json against
# .claude/plans/triage/pr2-baseline-coverage.json and confirm
# lines, statements, functions, and branches are all >= baseline
```

## Risks specific to this PR

- **Whitespace and comment generators are easy to mis-design.** A generator
  that emits whitespace inside a multi-char operator (e.g. `=` `=` instead of
  `==`) breaks round-trip in a way that's actually a generator bug, not a
  lexer bug. Bias whitespace generators toward inter-token positions.
- **Astral codepoints expose surrogate-pair handling in the lexer.** If a
  property reveals incorrect handling of `\u{1F600}`-class codepoints, treat
  as Tier 2 (fix in the PR) — this is part of the lexer's contract.
