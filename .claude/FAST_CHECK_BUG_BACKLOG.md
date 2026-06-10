# Fast-check Bug Backlog

Tracks bugs surfaced by property-based tests during the fast-check rollout. See
`.claude/CODING_STANDARDS.md` "Property-based testing" section for the triage
flow (Tier 1 fix-now / Tier 2 fix-this-PR / Tier 3 halt-and-escalate).

When a property fails:
1. Reproduce locally with the printed seed.
2. Classify per the tiers below.
3. For Tier 2/3, add an entry here AND `it.skip("[BUG: VF-FC-####] ...")` in
   the test file with a comment linking back to this entry.
4. Closed entries move to commit history; only **open** bugs live here.

## Open

| ID | File | Property | Tier | Counterexample (shrunken) | Seed | Conjecture | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VF-FC-0012 | `packages/core/src/parser/parse-expression-operators.ts` (postfix `parseCall` loop handles only LPAREN/DOT, no LBRACKET) + `packages/core/src/types/ast.ts` (no `Index` node) | n/a — discovered while authoring fixed-input spec-validation tests for the `[]` indexing operator (chunk 16, 13 F-33); not surfaced by a property | 3 | <pre>let xs = [10, 20, 30];<br>let y = xs[0];   // error[VF2107]: Expected ';' or newline<br>let r = { a: 1 };<br>let y2 = r["a"]; // error[VF2107]</pre> | n/a | Spec `docs/spec/13-appendix.md:89` lists `[]` as a precedence-16 list/record **indexing** operator. It is **not implemented**: there is no `Index` AST variant anywhere in `core/src/types/ast.ts`, and the postfix loop in `parse-expression-operators.ts` (`parseCall`, precedence 15) only consumes `LPAREN` (call) and `DOT` (record access) — never `LBRACKET`. So `xs[0]` / `r["a"]` die at the parser with `VF2107`. NB: the audit (`.claude/spec-audit/13-appendix.md` F-33) wrongly marks this ✅ Implemented citing an "`Index` node at `ast.ts:85`" (that line is the `List` node) and "parsePostfix handles LBRACKET" (no such code) — the audit entry must be corrected. Fix: add an `Index` surface node + an `LBRACKET` postfix parse rule, then thread it through desugar/typecheck/codegen. **Also needs a spec decision**: out-of-bounds list index and missing record key are currently undocumented (Option vs panic) — the appendix only gives precedence. Bug-pinned at `tests/e2e/spec-validation/04-expressions.test.ts` (`[BUG: VF-FC-0012]`, asserts current `VF2107`); once implemented, flip to read + out-of-bounds tests per the chosen semantics. **Halt the PR for human triage** — documented operator entirely unimplemented; needs spec + audit correction. | Open |

## Triage tiers (reference)

- **Tier 1 — Trivial:** off-by-one / missing guard / wrong identity. Fix < 20 LOC, one file. Fix in same commit as the property; add the shrunken counterexample as a fixed regression test alongside.
- **Tier 2 — Localized:** correctness bug confined to one module, no public API change. Skip + backlog in commit N; fix and re-enable in commit N+1, same PR. Remove the backlog entry on fix.
- **Tier 3 — Soundness/design:** typechecker accepts ill-typed program; optimizer changes observable semantics; codegen emits incorrect JS. Skip + backlog + **halt the PR** for human triage.
