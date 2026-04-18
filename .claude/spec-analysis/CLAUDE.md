# Spec Validation Analysis — Navigation Guide

This directory contains an analysis of the failing tests in `tests/spec-validation/`, grouped by root cause, with a recommended implementation ordering for fixing them.

## Start here

- **[tasks.md](./tasks.md)** — Checklist of all remediation work. Check items off as you complete them.
- **[ordering.md](./ordering.md)** — The recommended implementation plan: 7 phases with effort estimates and rationale. This is the authoritative source for scope and sequencing.

## Top-level files

- **ordering.md** — 7-phase implementation plan, ordered by impact and dependency. Start here for context before picking up work.
- **group-dependencies.md** — Dependency relationships between the cross-cutting groups, including a Mermaid diagram. Read this to understand why the phases are ordered the way they are.
- **tasks.md** — Flat checklist derived from `ordering.md` for progress tracking.

## `groups/`

Cross-cutting groupings of failures by root cause. 11 files: `00-ungrouped-issues.md` plus `01`–`10` for Groups G1–G10. Each file names the root issue, the spec sections it affects, the approximate test count, and what other work it blocks or is blocked by. Use these when you need the "why" behind a phase item.

## `details/`

Per-spec-section failure analysis. One file per numbered section in `docs/spec/`, from `02-lexical-structure.md` through `12-compilation.md`. Each file enumerates the specific failing tests in that section, their root causes, and code-level references (file paths, line numbers). Use these when you are implementing a fix and need concrete test names and code locations.

## Suggested workflow

When picking up a task from `tasks.md`:

1. Read its phase entry in `ordering.md` for scope and rationale.
2. Read the matching `groups/` file for cross-cutting context and dependency caveats.
3. Consult the relevant `details/` file(s) for the concrete list of failing tests and the code paths to modify.
4. Implement the fix, run `pnpm spec:validate --verbose` to confirm tests pass, then check the item off in `tasks.md`.
