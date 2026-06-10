# Fast-Check Bug Backlog — Master Remediation Plan

Master, ordered task list for fixing the 12 open bugs in
`.claude/FAST_CHECK_BUG_BACKLOG.md`, **one bug at a time**, TDD-first.

Each bug has a detailed plan in this directory (`vf-fc-XXXX-*.md`). Each plan is
**red → green**: write the failing test first, then the minimal fix that makes it pass,
then fill in the remaining test layers (CLAUDE.md directive 5).

---

## Design decisions (resolved with the language owner)

| Bug | Decision |
| --- | --- |
| VF-FC-0012 indexing | `xs[i]` returns **`Option<T>`**; out-of-bounds → `None`. List indexing is the guaranteed deliverable; record dynamic-key indexing is a flagged follow-up. |
| VF-FC-0011 `Any` | **Opaque** (Any↔Any only) — current behavior. Fix = spec clarification + the deferred `VF4020` test. ~Zero code. |
| VF-FC-0010 null→Option | **Unconditional** marshalling for `-> Option<T>` externals. `--runtime-checks` flag **out of scope**. |
| VF-FC-0007 unwrap msg | **Match spec, embed err**: Result → `"Called unwrap on Err value: <String(err)>"`; Option → `"Called unwrap on None"`. |
| VF-FC-0005 reassign | Reassignment `x = expr;` is a **statement returning `Unit`**, mirroring `:=`. |

---

## Coverage baseline (do this FIRST — CLAUDE.md "Planning & Code Coverage")

Before touching any code, run and record the floor here:

```bash
pnpm run test:coverage
```

| Metric | Baseline % | Source: main |
| --- | --- | --- |
| Lines | 92.84 | combined `All files` (repo-root `pnpm run test:coverage`, pre-Phase-0) |
| Statements | 92.04 | combined `All files` |
| Functions | 93.02 | combined `All files` |
| Branches | 86.78 | combined `All files` |

Re-run after every phase; coverage must stay **≥ baseline** (CI gates this). If it drops,
add unit→integration tests until back to par.

---

## Ordering rationale (the ultrathink)

1. **Soundness before features.** Fix the optimizer that *drops side effects*
   (VF-FC-0002) before adding new side-effecting surface constructs (reassignment
   VF-FC-0005, indexing VF-FC-0012) — otherwise their effects could be silently elided.
2. **Foundations before dependents.** Multi-arg function-type currying (VF-FC-0009)
   underlies all external/multi-param work; it precedes overload validation (VF-FC-0008)
   and FFI marshalling (VF-FC-0010).
3. **Establish shared mechanics once.** Runtime-helper gating (VF-FC-0006) before its
   second consumer (VF-FC-0010); new-AST-node mechanics (VF-FC-0005) warm up VF-FC-0012.
4. **Quick isolated wins first** to clear noise and re-enable the property suite.

---

## Task list (do top to bottom)

### Phase 0 — Quick wins (isolated, low risk)
- [x] **1. VF-FC-0001** — restrict `lambdaArb` param to var/wildcard → `vf-fc-0001-test-arb-lambda-param.md`
- [x] **2. VF-FC-0007** — align unwrap panic messages to spec → `vf-fc-0007-unwrap-messages.md`
- [x] **3. VF-FC-0011** — document `Any` as opaque + deferred test → `vf-fc-0011-any-opaque.md`
- [x] Phase gate: `pnpm run verify` + `pnpm run test:coverage` (≥ baseline)

### Phase 1 — Soundness foundation
- [x] **4. VF-FC-0002** — root cause was the **desugarer** (`desugarBlock` discarded a block-`Let`'s parsed body), not the optimizer/codegen; the optimizer isn't even run in the CLI pipeline → `vf-fc-0002-optimizer-side-effects.md`
- [x] **5. VF-FC-0003** — empty-list value restriction → `vf-fc-0003-empty-list-value-restriction.md`
- [x] Phase gate: `pnpm run verify` + coverage (combined ≥ baseline: lines 92.97, stmts 92.16, funcs 93.03, branches 86.96)

### Phase 2 — Typechecker externals/inference cluster (strict order)
- [x] **6. VF-FC-0009** — curry multi-param `(A,B)->R` function types in `convertTypeExpr`; codegen additionally needed a curried wrapper const for multi-param externals (the desugarer emits single-arg call chains against n-ary JS functions) → `vf-fc-0009-multiarg-function-type-curry.md`
- [x] **7. VF-FC-0008** — overload grouping/validation (VF4801/02/03) now runs on post-desugar `CoreExternalDecl` (buildEnvironment takes `CoreModule`; cast removed); arity resolution wired through `inferApp` (application-spine reassembly) and codegen emits overloaded calls as one n-ary `jsName(...)` → `vf-fc-0008-external-overload-validation.md`
- [x] **8. VF-FC-0004** — record pattern vs free tyvar now instantiates the closed record type implied by the pattern fields (`checkRecordPattern` skeleton unification, mirroring tuples) → `vf-fc-0004-lambda-record-pattern-inference.md`
- [x] Phase gate: `pnpm run verify` + coverage (combined ≥ baseline: lines 93.00, stmts 92.21, funcs 93.10, branches 87.07)

### Phase 3 — Codegen cluster
- [ ] **9. VF-FC-0006** — panic runtime helper → `vf-fc-0006-panic-runtime-helper.md`
- [ ] **10. VF-FC-0010** — FFI null→Option marshalling → `vf-fc-0010-ffi-null-to-option.md`
- [ ] Phase gate: `pnpm run verify` + coverage

### Phase 4 — New surface syntax (last)
- [ ] **11. VF-FC-0005** — mutable-binding reassignment `x = expr;` → `vf-fc-0005-mutable-binding-reassignment.md`
- [ ] **12. VF-FC-0012** — list indexing `[]` → `Option<T>` → `vf-fc-0012-indexing-operator.md`
- [ ] Final gate: `pnpm run verify` + `pnpm run test:coverage` (≥ baseline) + `pnpm docs:errors` (if error codes changed)

---

## Cross-cutting concerns (coordination matrix)

| Shared surface | Bugs | Coordination |
| --- | --- | --- |
| `packages/core/src/types/ast.ts` (+ exhaustive switches in desugarer/typechecker/codegen) | 0005 (Assign), 0012 (Index) | Both add a surface node threaded through every phase. Sequence 0005→0012; 0012 rebases on 0005's new switch arms. |
| `convertTypeExpr` / function-type representation | 0009 (curry), 0008 (overload arity/shape) | 0009 first; 0008's `VF4803` shape + arity resolution must match curried `Fun`. |
| Codegen runtime-helper gating (`runtime-helpers.ts`, `context.ts`, `generator.ts`, `RuntimeHelperFlags`) | 0006 (`needsPanic`), 0010 (marshalling) | Extend the flags struct once in 0006; 0010 follows the pattern. |
| `isSyntacticValue` / generalization | 0003 | Shared by every binding path → run full typechecker + let-matrix after. |
| Optimizer purity (`hasSideEffects`) + wildcard-let elimination | 0002 | New predicate guards wildcard-let drop. Lands before 0005/0012. |
| `tests/e2e/spec-validation/04-expressions.test.ts` | 0002, 0003, 0004, 0012 | Distinct sections; sequential, so no merge collisions. |
| `tests/e2e/spec-validation/10-javascript-interop.test.ts` | 0008, 0009, 0010, 0011 | Distinct sections; sequential. |
| `tests/e2e/let-binding-matrix.test.ts` | 0003, 0009 | Add forms as each lands; rerun matrix. |
| `.claude/VIBEFUN_AI_CODING_GUIDE.md` | required: 0005, 0012 · conditional: 0003, 0007, 0009, 0010, 0011 | Update the guide for **new/changed user-observable syntax** (0005 reassignment, 0012 indexing). For **spec-conformance fixes** (0003, 0007, 0009, 0010, 0011) update **only if** the guide currently misstates the behavior. Sequential edits (different sections). |
| `.claude/spec-audit/13-appendix.md` | 0012 | Correct F-33 (wrongly ✅) in the same commit. |

---

## Per-bug workflow (apply to every task)

1. **Red:** write/enable the failing test(s) named in the bug's plan. Run them; confirm they fail for the stated reason.
2. **Green:** apply the minimal fix. Re-run the red test; confirm it passes.
3. **Fill layers:** add the remaining test layers (unit/integration/e2e/spec-validation/AI-guide/let-matrix/audit) per the plan.
4. **Re-enable** the corresponding `it.skip("[BUG: VF-FC-####] ...")` and **remove** the entry from `.claude/FAST_CHECK_BUG_BACKLOG.md` (rule: only open bugs live there).
5. **Verify:** `pnpm run check && pnpm run lint && pnpm test && pnpm run test:e2e && pnpm run format`.
6. **Commit** one bug per commit. *Tiers* (referenced per bug) come from
   `.claude/FAST_CHECK_BUG_BACKLOG.md` / `.claude/CODING_STANDARDS.md`: **Tier 2**
   (localized) may combine the property/test re-enable + fix in one commit; **Tier 3**
   (soundness/design) follows its individual plan. (Tiers are orthogonal to the Phases above.)

---

## Residual open items (track these)

- **VF-FC-0002** root cause is **not yet pinpointed** — step 1 is empirical localization (optimizer pass bisection vs codegen wildcard-let emission), not a presumed fix site.
- **VF-FC-0012** record-indexing typing is unresolved (closed records can't type dynamic keys); **list indexing ships first**. Confirm record-indexing scope before implementing it.
- **VF-FC-0010** intentionally drops the `--runtime-checks=ffi|all|none` flag from scope — file a separate future task if the flag is wanted.
- **VF-FC-0005** reassignment introduces a new error path (target must be `mut`-bound); if a new VF error code is added, run `pnpm docs:errors`.

Maintenance: this file names specific bug plans, source files, and test paths. If any are
renamed/moved/removed, update this file and the affected `vf-fc-*.md` plan in the same change.
