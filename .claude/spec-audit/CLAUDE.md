# spec-audit/

Snapshot of a deep audit comparing the [vibefun spec](../../docs/spec/) against the implementation and test suite. **Not living docs — a point-in-time report.**

## Pitfalls

- **"❌ Untested" is sometimes a false positive.** Per-section subagents occasionally missed test files when citing tests. Before remediating any "Untested" verdict in `testing-gaps.md` or a per-section doc, grep for the feature name and cross-check the orphan-test list in `cross-cutting.md`. The dedicated test may exist.
- **Do not edit per-section docs piecemeal.** They were generated together, by parallel agents, with cross-references. Patching one doc breaks consistency with the synthesis docs (`feature-gaps.md`, `testing-gaps.md`, `redundancies.md`). To refresh, regenerate the whole audit (see below).
- **F-NN IDs are scoped per-doc, not globally unique.** `F-04` in `06-functions.md` is a different feature from `F-04` in `03a-types-core.md`. Always cite as `<doc>:F-NN`.
- **Synthesis docs aggregate from per-section docs.** If you regenerate any per-section doc, the synthesis docs are stale and must be regenerated too.
- **Coverage baseline is a floor.** `_coverage-baseline.txt` is the snapshot at audit start. Any follow-up implementation/test work driven by audit findings must defend ≥ those numbers (per `CLAUDE.md` § Planning & Code Coverage).
- **Stdlib gap is a cluster.** ~70% of P1 feature gaps are Array/Map/Set/Json modules unimplemented. Treat that as one initiative, not 56 tickets.

## Structure

- `_methodology.md` — the procedure each subagent followed (durable; preserve across refreshes)
- `_template.md` — per-section doc shape (durable; preserve across refreshes)
- `_coverage-baseline.txt` — coverage snapshot at audit start
- `README.md` — index, executive summary, quality caveats
- `NN-<section>.md` (and `03a/03b/03c`, `04a/04b`, `11a/11b` splits) — per-section audits
- `cross-cutting.md` — property arbitraries, fixtures, snapshots, orphan-test reverse-mapping
- `feature-gaps.md`, `testing-gaps.md`, `redundancies.md` — synthesis from per-section docs

## Conventions used in audit docs

- **Status**: `✅ Implemented`, `⚠️ Partial`, `❌ Missing`, `⏸️ Future`
- **Coverage assessment**: `✅ Adequate`, `⚠️ Thin`, `❌ Untested`
- **Layer tags** (in `testing-gaps.md`): `U` Unit, `I` Integration, `S` Snapshot, `E` E2E (outside spec-validation), `V` Spec-validation, `P` Property-based
- **Priority tiers** (in `feature-gaps.md`): `P1` runtime divergence, `P2` compiler-rejecting bug, `P3` cosmetic/internal

## Regeneration

The audit is driven by a plan at `~/.claude/plans/ultrathink-and-create-a-reflective-deer.md` (or rerun the original prompt: "Ultrathink and create a plan that will perform a deep audit of the vibefun language spec implementation"). High-level steps:

1. Capture coverage baseline: `pnpm run test:coverage`, then read `coverage/coverage-summary.json`'s `total` block into `_coverage-baseline.txt`.
2. Phase 1: 17 audit chunks (16 spec sections + cross-cutting), batched 4-at-a-time as parallel `Explore` subagents. Chunking and per-agent prompts are in the plan file. Each agent reads `_methodology.md` and `_template.md` first, then writes one `.md` file.
3. Phase 2: 3 synthesis subagents (use `general-purpose` — they need reliable Write access). Each reads all 17 per-section docs, aggregates, writes one synthesis doc.
4. Phase 3: regenerate `README.md` last (executive summary, index, caveats).

If only a subset of spec sections changed since last audit, regenerate just those per-section docs **plus all 3 synthesis docs plus README** — never leave synthesis stale.

## What NOT to do here

- Don't write fixes for findings in this folder. Findings drive *separate* implementation/test plans (each gap → its own plan with its own coverage baseline).
- Don't add running totals or progress tracking — those belong in implementation plans, not the audit snapshot.
- Don't list orphan tests as "missing tests". They are real tests not cited by basename in audit docs; most cover features the audit *did* cite.

---

Maintenance: This file names specific docs (`_methodology.md`, `_template.md`, `_coverage-baseline.txt`, `cross-cutting.md`, etc.) and the regeneration plan path. Update if any are renamed or moved.
