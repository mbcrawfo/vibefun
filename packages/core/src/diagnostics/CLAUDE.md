# Diagnostics Module

Unified error/warning system for the compiler. All user-facing diagnostics use `VFxxxx` codes.

**Full documentation lives in `./README.md`** (architecture, usage, code ranges). Don't duplicate it here — read it before making changes.

## Critical Rules

- **User-facing errors** → `throwDiagnostic("VFxxxx", loc, params)`. Must match a registered code.
- **Internal bugs / unreachable cases** → plain `throw new Error(...)`. Do not register codes for them.
- **After adding, changing, or removing a code definition, run `pnpm docs:errors`.** The user-facing docs in `docs/errors/` are regenerated from the code; CI fails if they're stale.

For the step-by-step guide to adding a new code, see `./codes/README.md`.

## Maintenance

If files are added/renamed here (`diagnostic.ts`, `registry.ts`, `factory.ts`, `warning-collector.ts`), update `./README.md`'s architecture diagram in the same commit.
