# Typechecker Enhancement Plan: Algorithm M Migration & Multi-Error Reporting

**Status:** Proposed
**Scope:** Transition the typechecker from eager Algorithm W to two-phase Algorithm M, and add multi-error reporting on top of the unified diagnostic system.
**Related specs:** `.claude/design/typechecker-requirements.md` §7.5 (Algorithm M) and §7.7 (error recovery), `docs/spec/03-type-system/error-reporting.md`.

This document is the *implementation* plan that bridges the existing Algorithm W codebase (under `packages/core/src/typechecker/`) to the Algorithm M design already specified in the requirements doc. The design itself is not re-derived here — read §7.5 and §7.7 first.

---

## 1. Goals

1. Replace eager unification (Algorithm W) with two-phase constraint generation + solving (Algorithm M).
2. Surface **multiple independent type errors** per compile rather than throwing on the first failure.
3. Suppress cascading errors using an `Error` placeholder type.
4. Preserve current behaviour for any well-typed program — no observable change for code that compiles today.

### Non-goals

- Bidirectional checking *features* beyond what Algorithm M needs to function (no higher-rank polymorphism, no GADTs, no annotation-driven subsumption beyond the current width-subtyping rules).
- IDE/incremental support. The architecture must not preclude it, but partial-result APIs are out of scope here.
- Cross-module error recovery. Each module still type-checks independently; we just want every error within a module to surface.
- Performance optimization (union-find, hash-consing). Defer until we have a measured regression.

---

## 2. Current State (Snapshot)

### 2.1 Inference is eager Algorithm W

`packages/core/src/typechecker/typechecker.ts` is the driver: it loops `for (const decl of module.declarations)` and calls `typeCheckDeclaration`, which builds an `InferenceContext` and calls `inferExpr(ctx, decl.value)`. Each `inferExpr` dispatch returns `{ type, subst }` — the substitution is composed eagerly as inference recurses.

The split inference modules (`infer/infer-{primitives,bindings,functions,operators,structures}.ts`) are wired at import time via the dependency-injection scheme described in `packages/core/src/typechecker/CLAUDE.md`. `infer/infer-primitives.ts` holds the `inferExpr` dispatcher; the four specialized modules each receive `setInferExpr(inferExpr)` and `infer-primitives` receives `setInferenceFunctions({...})` from `infer/index.ts`.

Unification (`unify.ts`) takes `(t1, t2, ctx)` and **throws `VibefunDiagnostic` on the first failure** — see e.g. `unify.ts:250` (`VF4020`), `:256` (`VF4021`), `:284` (`VF4022`), `:341` (`VF4024`), `:397` (top-level fallback). Because inference calls `unify` directly inside the recursion, the throw aborts the entire `typeCheck()` call — no further declarations are inspected.

### 2.2 `constraints.ts` is dead code

`packages/core/src/typechecker/constraints.ts` already defines `EqualityConstraint`, `InstanceConstraint`, `equalityConstraint()`, `instanceConstraint()`, and a `solveConstraints()` driver. Its only consumer is `constraints.test.ts`. The CLAUDE.md for the typechecker module flags it explicitly: *"Currently only referenced by its own test file — unused by the inference pipeline. Treat it as work-in-progress or dead code."*

The `solveConstraints` implementation is eager (it `unify`s as it walks the list), so it isn't yet a real Phase-2 solver — it's a stub.

### 2.3 The `Type` ADT has no `Error` placeholder

`packages/core/src/types/environment.ts` defines `Type` with eleven variants: `Var`, `Const`, `Fun`, `App`, `Record`, `Variant`, `Union`, `Tuple`, `Ref`, `Module`, `Never`, `StringLit`. No error/poison variant exists. Every consumer of `Type` exhaustively switches on `type.type`, so adding a variant is a compile-time-checked refactor: the TS compiler will list every site that needs updating.

Known exhaustive-switch sites (from a pre-survey, all need an `Error` arm):
- `unify.ts` — `applySubst`, `expandAliasFully`, `unifyVar`, the main `unify` dispatch, `occursCheck`
- `infer/infer-context.ts` — `substituteTypeVars`
- `typechecker/format.ts` — `typeToString`
- `typechecker/types.ts` — `freeTypeVars`, `freeTypeVarsAtLevel`, helper predicates
- `typechecker/patterns.ts` — pattern type checking
- `codegen/` — only matters if error types reach codegen; they should not.

### 2.4 Diagnostics already model multi-error well — except the typechecker doesn't use it

`packages/core/src/diagnostics/`:
- `VibefunDiagnostic` is an `Error` subclass with `{definition, message, location, hint}`. `format(source?)` produces a Rust-style rendering with `--> file:line:col`, source caret, and hint lines.
- `factory.ts` has `createDiagnostic(code, loc, params)` (returns the diagnostic) and `throwDiagnostic(...)` (throws it). The non-throwing form is already there.
- `WarningCollector` exists and demonstrates the collection pattern: `add()`, `getWarnings()`, `formatAll(source)`. We need an error analogue.
- Diagnostic codes live under `diagnostics/codes/` and run `pnpm docs:errors` to regenerate `docs/errors/`.

The CLI already iterates over arrays: `compile.ts:611` formats `diagnostics: VibefunDiagnostic[]`, and the multi-file path constructs lists of errors. The output layer is multi-error capable today — the typechecker just never produces more than one.

### 2.5 What the requirements doc already specifies

`.claude/design/typechecker-requirements.md` §7.5 and §7.7 specify:
- Algorithm M two-phase architecture (generation, then solving)
- Three constraint kinds: `Equality`, `Instance`, `Subtype`
- Bidirectional generation (synthesis vs checking)
- An `Error` type variant as the recovery placeholder
- Cascading-error suppression via "error type unifies with anything silently"
- Error prioritization order

This plan does **not** redesign any of that. It schedules the implementation work and the migration shape.

---

## 3. Target Architecture

### 3.1 Phase 1: Constraint generation

`generateConstraints(env, expr, expected | null) → { type, constraints }`

- Pure tree traversal. **No `unify` calls during generation.**
- `expected: Type | null` controls bidirectional mode (synthesis when `null`, checking when a type is supplied).
- Levels are managed during generation (`enterLevel` / `leaveLevel`) exactly as today, so generalization timing is preserved.
- Returns `{ type, constraints: Constraint[] }`. The substitution disappears from the per-expression API; it's produced once in Phase 2.

Constraint shape from `constraints.ts`, extended with `Subtype`:

```ts
type Constraint =
    | { kind: "Equality"; t1: Type; t2: Type; loc: Location }
    | { kind: "Instance"; type: Type; scheme: TypeScheme; loc: Location }
    | { kind: "Subtype"; sub: Type; super: Type; loc: Location };
```

In practice, until function variance lands, `Subtype` is only emitted by record-position checks — and even those can stay as `Equality` if we keep width-subtyping inside `unify` (see §6).

### 3.2 Phase 2: Constraint solving

`solveConstraints(constraints) → { subst, errors }`

- Walks the constraint list once, applying the running substitution before unifying.
- Catches `VibefunDiagnostic` from `unify` per-constraint. Each catch:
  1. records the diagnostic into `errors`,
  2. binds the offending fresh type variables to a new `Error` placeholder so downstream constraints involving those vars don't re-fire,
  3. continues with the next constraint.
- Returns the substitution (with `Error` placeholders bound where unification failed) and the accumulated list of `VibefunDiagnostic`s.

### 3.3 The `Error` placeholder

Add to `Type`:

```ts
| { type: "Error"; id: number }
```

Behaviour:
- `unify(Error, _) = unify(_, Error) = emptySubst()` — silently absorbs any pairing.
- `applySubst` and `substituteTypeVars` treat `Error` as a leaf.
- `occursCheck` returns false for it.
- `typeToString(Error)` renders as `<error>` so it never appears in user-facing types unless the inferred result is itself an error (in which case the user already has at least one diagnostic).
- Codegen never sees `Error`: if a module has any errors, compilation halts before codegen (see §3.5).

Each fresh `Error` carries a unique `id` for two reasons: (1) it lets us identify "derived" usage (`y` referencing a failed `x`) in tests, (2) it keeps the type structurally distinct from valid types so unification asymmetries don't accidentally unify two unrelated errors.

### 3.4 Driver API

`typeCheck(module, options)` keeps its current signature but stops throwing on the first error. Instead:

```ts
export type TypedModule = {
    module: CoreModule;
    env: TypeEnv;
    declarationTypes: Map<string, Type>;
    errors: VibefunDiagnostic[];   // NEW — empty on success
};
```

Adding a field rather than changing return shape means existing consumers (codegen, tests) keep compiling. Codegen and the multi-file driver gain an explicit "errors empty?" guard.

Alternative considered: throw an aggregated `VibefunDiagnostic[]`-bearing error. Rejected because it requires a new error class and the CLI already handles arrays cleanly.

### 3.5 CLI integration

`packages/cli/src/commands/compile.ts:251` (single-file) and `:331-` (multi-file) currently catch `VibefunDiagnostic` and convert one error to a `formatErrorResult`. Update to:
1. Call `typeCheck` and inspect `typedModule.errors`.
2. If non-empty, route through `formatErrorResult(errors, source, options, timer, colors)` (already accepts an array — see `compile.ts:611`).
3. Skip codegen when there are errors. Continue to the next module in multi-file mode so we surface every module's errors in one run.

JSON output already lists errors as an array; nothing to change at the schema level.

---

## 4. Migration Strategy

The migration is staged so the test suite passes after every step. Each step is a candidate PR boundary.

### Step 1 — Add the `Error` type variant (refactor only)

- Add `{ type: "Error"; id: number }` to `Type` in `types/environment.ts`.
- Implement a `freshErrorType(): Type` helper in `typechecker/types.ts` (counter local to the module; no need to share the type-var counter).
- Walk every exhaustive switch on `type.type` and add an arm. The TS compiler enumerates them; expected sites listed in §2.3.
- For `unify`, the `Error` arm returns `emptySubst()` for both directions and is checked **before** the existing var/const/fun rules.
- For `typeToString`, render as `<error>`.
- For `applySubst`, `substituteTypeVars`, `freeTypeVars*`: treat as a leaf with no contained vars.
- No behaviour change for any existing program — the variant is unreachable until Phase 2 produces it.
- Tests: a unit test in `unify.test.ts` showing `unify(Error, Int) = empty` and similar for every constructor.

### Step 2 — Promote `constraints.ts` to first-class

- Add the `Subtype` constraint kind alongside the existing two. (Initially unused; emit it later.)
- Replace the eager `solveConstraints` with one that takes a context (for alias expansion via `TypeBinding` map) and **catches** `VibefunDiagnostic` per constraint, returning `{ subst, errors }`.
- Keep `applySubstToConstraint` as-is.
- Update the existing `constraints.test.ts` to cover error collection and `Error`-placeholder binding on failure.

### Step 3 — Convert `inferExpr` to constraint generation

This is the largest step. Strategy: convert leaves first, then internal nodes, gated by a feature flag — `INFER_MODE = "W" | "M"` — until the suite is green in `M` mode, then delete `W`.

Per-file plan:

| File | What changes |
|------|--------------|
| `infer/infer-context.ts` | Drop `subst` from `InferenceContext` (or keep it empty in M-mode); add an `expected: Type \| null` parameter convention to inferer signatures |
| `infer/infer-primitives.ts` | The dispatcher returns `{ type, constraints }`. Variable lookup emits an `Instance` constraint (§7.5 example). Type annotations become an `Equality(annot, inner.type)` constraint. |
| `infer/infer-functions.ts` | Lambdas: synthesize `param`/`return`, generate body in checking mode against `return`. Apps: synthesize the function (or check against `expected → fresh`), then check args against the parameter types. |
| `infer/infer-bindings.ts` | `let` / `let rec`: generate the binding under `enterLevel`, generalize after Phase 2 produces the substitution (the generalize step has to wait until solving is done so freed vars are concrete). |
| `infer/infer-operators.ts` | Mostly mechanical: emit `Equality` constraints for operand types and result type. |
| `infer/infer-structures.ts` | Records: emit equality constraints per field; `record-update` emits subtyping constraints for the spread. Variants/match: per-arm checking against the scrutinee and the result. |
| `patterns.ts` | `checkPattern` takes the scrutinee type; produces constraints rather than calling `unify` directly. |
| `unify.ts` | **No interface changes.** Stays the unification primitive used by Phase 2. |
| `typechecker.ts` | Per declaration: `(1) generate`, `(2) solve`, `(3) generalize` using the substitution from solving. Accumulate errors. |

Generalization currently lives in `infer/infer-bindings.ts:generalize`. It uses the running substitution and `freeTypeVarsAtLevel`. In Algorithm M, `generalize` is called **after** `solveConstraints` returns the substitution for the binding's body. The level discipline in §7.4 of the requirements doc is unchanged.

### Step 4 — Wire multi-error driver

- Change `typeCheck` to return `{...TypedModule, errors}` instead of throwing.
- `typeCheckDeclaration` returns `{ env, errors }`. On error, the next declaration runs against the *original* env (or, if the failed binding pattern produced bindings, against env extended with `Error`-typed bindings so later references suppress instead of complain).
- The multi-file CLI path keeps iterating modules even if earlier modules have errors. Codegen runs only when the entire pipeline produced zero errors (gate at `compile.ts:337` and the multi-file equivalent).

### Step 5 — Cascading-error suppression tests

Build a regression suite that pins the prioritization rules in §7.7 of the requirements doc:

- Multiple unrelated `let` declarations each with one error → all errors reported.
- One undefined variable used in three places → one error reported, two suppressed.
- A failed unification in a function body should not poison the outer let's generalization (the binding gets type `Error`, but later bindings type-check normally).
- `unsafe` blocks containing errors still report.

Snapshots in `infer-bindings-errors-and-edges.test.ts` and `unify.test.ts` will need updating; that's expected and signals the behavioural change.

### Step 6 — Remove the feature flag and Algorithm W code path

Delete `INFER_MODE`, the W-mode branches, and any duplicated helpers. Update the typechecker `CLAUDE.md` so the *"Algorithm W"* label flips to *"Algorithm M (constraint-based)"*. The `constraints.ts` note becomes "constraint engine for Phase 2 of inference".

---

## 5. Documentation Updates (in-PR)

- `packages/core/src/typechecker/CLAUDE.md` — replace the Algorithm W description; remove the `constraints.ts` "WIP / dead code" warning; document the two-phase inference flow and the `Error` placeholder rule.
- `packages/core/src/types/CLAUDE.md` — add `Error` to the `Type` variants list with a one-liner on its purpose.
- `docs/compiler-architecture/02-compilation-pipeline.md` — the "Why Algorithm M" rationale already exists; flip the wording from "planned" to "implemented".
- `.claude/design/typechecker-requirements.md` — strike the §8.1 error-priority gap and the §8.2 error-recovery ambiguity once they're real in code, and link this enhancement plan from §7.5 / §7.7.
- `.claude/design/typechecker-gaps.md` — close out Gap 2 and Gap 8's "future work" notes (or delete the file once it's fully obsolete).

---

## 6. Risks and Open Questions

1. **Width subtyping placement.** Today, `unifyRecords` in `unify.ts` implements width subtyping symmetrically by intersecting field sets. Two options for Phase 2:
   - Keep width subtyping inside `unify`, never emit `Subtype` constraints. Simplest, preserves current semantics.
   - Emit `Subtype` constraints from record positions and have a separate solver branch. More uniform, but it's design churn for no behaviour change.

   **Recommendation:** keep width subtyping in `unify` and reserve `Subtype` for the future (variance, function subtyping). Implement the `Subtype` constraint kind anyway so the solver has a place for it.

2. **Generalization timing across mutual recursion.** `CoreLetRecGroup` in `typechecker.ts` infers all bindings against placeholders, then unifies. In Algorithm M, the binding bodies generate constraints under shared placeholders, the group is solved together, and generalization happens once after the whole group's substitution settles. This is straightforward but needs targeted tests in `infer-bindings-recursive.test.ts`.

3. **Import bindings as fresh type variables.** `typechecker.ts:309-326` deliberately binds non-stdlib imports to fresh monomorphic vars as a transitional measure. Algorithm M doesn't change this directly, but the multi-error driver should treat unresolved cross-module imports the same way `Error`-typed bindings work: don't cascade into derived errors.

4. **`Module` type unification.** `unify.ts:337` matches modules by path and throws otherwise. If a module path mismatch happens in the middle of a constraint list, the placeholder-binding approach has to deal with `Module` at the failure site. Rare in practice; covered by the `Error` rule but worth a unit test.

5. **Error prioritization is design-by-policy.** The requirements doc lists an order (mismatches → occurs check → undefined → subtyping). Implementation reality: we collect *all* errors and report all of them, but suppress derived errors via `Error` placeholders. Whether to additionally re-rank within a module is an open call; the simplest implementation is "report in source order after suppression". Recommended: ship that, revisit only if user feedback demands.

6. **Test suite churn.** Many tests currently use `expect(() => typeCheck(...)).toThrow(/VFxxxx/)`. Those need to become `expect(typeCheck(...).errors[0].code).toBe("VFxxxx")`. This is mechanical but touches dozens of files. A test-helper (`expectFirstError(module, code)`) keeps the diff manageable.

---

## 7. Coverage Plan

Per the project's *Planning & Code Coverage* directive in `CLAUDE.md`:

**Baseline (before any work):** run `pnpm run test:coverage` on `main` and record combined line / statement / function / branch percentages in this section. Floor must not drop.

**During implementation:** every new branch — each `Constraint` kind, each error-recovery arm in the solver, the `Error`-type leaf in every exhaustive switch, the new `errors` array path in the driver — must have at least one test that exercises it end-to-end. Default to unit tests colocated with the source; add an integration test under `infer-*.test.ts` for any cross-module behaviour; add an e2e test under `tests/e2e/` for the CLI multi-error rendering.

**Post-implementation:** re-run `pnpm run test:coverage` and confirm the combined percentages are ≥ baseline. If anything dropped, find the missing branch and add a test before merging.

---

## 8. Verification Checklist

Before declaring the migration complete, confirm:

- [ ] `pnpm run verify` passes (build + check + lint + test + test:e2e + format:check).
- [ ] `pnpm docs:errors` is clean (no new VFxxxx codes added without docs).
- [ ] No remaining `throwDiagnostic` calls inside `unify.ts` reach `typeCheck`'s caller — they're caught by `solveConstraints`.
- [ ] `constraints.ts` is referenced by the inference pipeline (check via `grep -r "solveConstraints" packages/core/src/typechecker/`); the typechecker `CLAUDE.md` no longer warns it is dead code.
- [ ] An end-to-end test compiles a `.vf` file with three independent type errors and asserts that all three are reported.
- [ ] An end-to-end test compiles a `.vf` file with one undefined variable referenced in five places and asserts that exactly one error is reported.
- [ ] CLI exit code on multi-error compile is non-zero and JSON output lists every diagnostic.

---

## 9. Out of Scope (Captured for Later)

- IDE integration / partial-result API on `TypedModule` (e.g. `typesByExprId: Map<NodeId, Type>`).
- Cross-module error recovery (an import error today blanks the importing module's bindings; once Algorithm M lands we *could* keep checking the rest of the module, but doing so requires fresh placeholders for every imported name).
- Performance work — measure first.
- The `--explain VFxxxx` CLI subcommand. The diagnostic registry already has `explanation` and `example` fields, so this is a small follow-up but separate from this plan.
