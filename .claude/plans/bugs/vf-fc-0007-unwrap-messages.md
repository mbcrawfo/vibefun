# VF-FC-0007 — Align `unwrap` panic messages with the spec

**Tier:** 2 (localized) · **Phase:** 0 (#2) · **Status:** Open

## Context

The stdlib `unwrap` panic messages diverge from the spec. **Decision (owner):** the spec
is the contract — match it, and embed the error value in the Result message.

- Result: throw `"Called unwrap on Err value: <String(err)>"` (spec `docs/spec/11-stdlib/result.md:224`).
- Option: throw `"Called unwrap on None"` (spec `docs/spec/11-stdlib/option.md:200`).

Current impl throws `"Result.unwrap called on Err"` / `"Option.unwrap called on None"`
and omits the error value entirely.

## Root cause

- `packages/stdlib/src/result.ts:31` — hardcoded `"Result.unwrap called on Err"`.
- `packages/stdlib/src/option.ts:31` — hardcoded `"Option.unwrap called on None"`.

## TDD plan

### Red — failing test first
Flip the bug-pinned assertions:
- `packages/stdlib/src/result.test.ts` (`[BUG: VF-FC-0007]`): change the expected regex to
  `/^Called unwrap on Err value: failed$/`, and add a case proving the err value is
  interpolated (e.g. `Err("custom")` → message contains `custom`).
- `packages/stdlib/src/option.test.ts` (`[BUG: VF-FC-0007]`): change to
  `/^Called unwrap on None$/`.

Run `pnpm --filter @vibefun/std test`; confirm both fail against the current wording.

### Green — the fix
- `result.ts`: `throw new Error(\`Called unwrap on Err value: ${String(result.$0)}\`);`
- `option.ts`: `throw new Error("Called unwrap on None");`

Re-run; confirm green.

## Test layers (CLAUDE.md directive 5)
- **Unit:** `result.test.ts`, `option.test.ts` (message + value-interpolation assertions).
- **AI-guide (conditional):** this aligns runtime messages to the existing spec contract
  (not new behavior), so a guide update is **not** expected. Update the stdlib quick-reference
  in `.claude/VIBEFUN_AI_CODING_GUIDE.md` only if it currently documents the old `unwrap` messages.
- No e2e/integration needed (pure stdlib functions).

## Cross-cutting concerns
Independent of VF-FC-0006 — this embeds via a string template, not the `panic` builtin.
(Once VF-FC-0006 lands, these could optionally call `panic`, but string interpolation here
is sufficient and self-contained.)

## Verification
```bash
pnpm --filter @vibefun/std test
pnpm run check && pnpm run lint && pnpm run format
```

## Backlog cleanup
Per Tier 2: fix + re-enable in the same PR; remove the VF-FC-0007 row from
`.claude/FAST_CHECK_BUG_BACKLOG.md`.
