# Audit: <Section Name> (<spec dir or file>)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/<file>.md` (NNN lines)
- `docs/spec/<dir>/<file>.md` (NNN lines)

**Implementation files**:
- `packages/core/src/<phase>/<file>.ts`
- `packages/stdlib/src/<file>.ts`
- ...

**Test files** (every layer):
- Unit: `packages/core/src/<phase>/<file>.test.ts`
- Integration: `packages/core/src/<phase>/<file>-integration.test.ts`
- Snapshot: `packages/core/src/<phase>/snapshot-tests/<file>.test.ts` + `__snapshots__/`
- E2E: `tests/e2e/<file>.test.ts`
- Spec-validation: `tests/e2e/spec-validation/NN-<section>.test.ts`
- Property: `packages/core/src/types/test-arbitraries/<arb>.ts` (used by `<file>.test.ts`)

## Feature Inventory

### F-01: <feature name>

- **Spec ref**: `docs/spec/<file>.md:<L1-L2>` — <one-line restatement of the normative claim>
- **Status**: ✅ Implemented | ⚠️ Partial | ❌ Missing | ⏸️ Future
- **Implementation**:
  - `packages/core/src/<phase>/<file>.ts:<L1-L2>` — <function or branch name>
  - (additional layers if multi-file)
- **Tests**:
  - Unit: `<file>:<test name>` (or `(none)`)
  - Integration: `<file>:<test name>` (or `(none)`)
  - Snapshot: `<file>` (or `(none)`)
  - E2E: `<file>:<test name>` (or `(none)`)
  - Spec-validation: `<file>:<test name>` (or `(none)`)
  - Property: `<file>:<property name>` (or `(none)`)
- **Coverage assessment**: ✅ Adequate | ⚠️ Thin | ❌ Untested
- **Notes**: <edge cases missed, suspicious behavior, partial-implementation details, etc.>

### F-02: <feature name>

(... repeat for every normative claim in the spec scope ...)

## Feature Gaps (this section)

- **F-NN**: <feature> — <why it's marked ⚠️ or ❌; brief remediation hint>
- **F-NN**: <feature> — ...

(Empty section: write `_None_.`)

## Testing Gaps (this section)

- **F-NN**: <feature> — <which layer(s) are missing tests; what scenario should be added>
- **F-NN**: <feature> — ...

(Empty section: write `_None_.`)

## Testing Redundancies (this section)

- **Candidate**: `<test file>:<test name>` overlaps with `<test file>:<test name>` — both assert <duplicated assertion>. Recommendation: <consolidate into one, or keep both because <reason>>.
- **Candidate**: ...

(Empty section: write `_None_.`)
