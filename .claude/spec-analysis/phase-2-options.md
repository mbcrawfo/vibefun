# Phase 2 — Stdlib Implementation Options

Analysis of implementation approaches for Phase 2 of
[ordering.md](./ordering.md) ("Stdlib Name Resolution"), the single
highest-impact block of work in the spec-validation remediation. This
document enumerates the design space and trade-offs, then narrows to a
recommended direction based on stated preferences. It is **not a concrete
implementation plan** — it is the prerequisite study.

Read alongside [groups/01-stdlib-module-name-resolution.md](./groups/01-stdlib-module-name-resolution.md)
for the failure analysis this addresses.

## 1. Context

Phase 2 unblocks ~150+ spec-validation tests that fail because the compiler
cannot resolve and execute stdlib calls like `String.fromInt(42)` or
`List.map(list, fn)`. Four underlying gaps drive every one of those
failures:

1. **Name resolution gap.** The parser produces
   `RecordAccess(Var("String"), "fromInt")` for `String.fromInt`. The
   typechecker registers builtins under flat keys like `"String.fromInt"`.
   `inferRecordAccess` (`packages/core/src/typechecker/infer/infer-structures.ts:82-130`)
   expects a real record type on the left side; it has no path to the flat
   builtin key. Result: `VF4100 undefined variable 'String'` before the
   field lookup is even attempted.

2. **Runtime absence.** `@vibefun/std` (`packages/stdlib/src/index.ts`) is
   a stub:

   ```ts
   export const VERSION = "0.1.0";
   ```

   The only runtime helpers emitted today are `ref`, `$eq`, `$intDiv`, and
   `$intMod` (`packages/core/src/codegen/es2020/runtime-helpers.ts`). If
   resolution were fixed in isolation, executed code would still throw
   `String.fromInt is not a function`.

3. **Builtin registration gaps.** `packages/core/src/typechecker/builtins.ts`
   registers 46 of the spec's ~112 functions. Entirely missing:
   - All of `Math` (`sqrt`, `pow`, `sin`, `cos`, constants `pi`/`e`, …).
   - `String.fromBool`, `Float.isNaN`, `Float.isInfinite`, `Float.isFinite`,
     `List.flatten`.
   - All of `Array`, `Map`, `Set`, `JSON` (the spec defines them; no types
     registered yet).
   - Wrong parameter order on 33 List/Option/Result functions — builtins
     use function-first (`List.map(fn, list)`); spec is data-first
     (`List.map(list, fn)`).

4. **List-spread codegen bug.** `packages/core/src/desugarer/desugarListWithConcats.ts:64`
   emits `CoreVar("concat")`, which doesn't match any builtin key (`"List.concat"`).

## 2. Key Pre-Design Observations

Facts about the current codebase that constrain or enable options:

- **Codegen already has an import emitter.**
  `packages/core/src/codegen/es2020/generator.ts:179-322` generates ES
  `import { name } from "..."` statements for `CoreImportDecl` and
  `CoreExternalDecl` with `from` clauses, deduplicating by name and source.
  The machinery for pulling stdlib from a package exists; it just isn't
  wired to the builtin environment.

- **Module infrastructure exists but is dormant.**
  `packages/core/src/module-loader/` and `packages/core/src/module-resolver/`
  can resolve `@vibefun/std` via node_modules, handle relative and package
  imports, cache by real path, and compute compile order. Not integrated
  into the CLI pipeline yet.

- **ESM throughout.** `packages/stdlib/package.json` has `type: "module"`
  with `exports: { ".": { import: "./dist/index.js" } }`. CLI `run`
  invokes `spawnSync("node", ["--input-type=module"], { input: code })`
  (`packages/cli/src/commands/run.ts:102`). Any chosen runtime path must
  be ESM.

- **Tests currently assume ambient stdlib.** Spec-validation programs
  (`tests/spec-validation/`) call `String.fromInt(42)` at the bare top
  level. The only wrapper the test helper adds is `console_log`
  (`tests/spec-validation/framework/helpers.ts:210-225`). The spec
  (`docs/spec/08-modules`) *does* mandate explicit
  `import { Option } from "@vibefun/std";`, but current fixtures rely on
  the names being ambient.

- **Currying is universal.** Phase 1.2 desugars `f(a, b)` to `f(a)(b)`. Any
  JS stdlib function must itself be curried:
  `const List_map = (xs) => (f) => …`.

- **Variant representation.** `Option`, `Result`, `List`, `JSON` use the
  `{ $tag, $0, $1, … }` shape. Recursive stdlib (fold, map, filter) must
  pattern on this representation.

- **Prior art.** See [§7](#7-prior-art). ReScript and Fable ship a runtime
  package as an npm dep. Elm inlines a bundled kernel. PureScript generates
  per-module ES modules with no runtime library.

## 3. Orthogonal Decisions

The problem factors into five decisions that can be mixed fairly freely.
Later sections combine them into coherent packages.

### D1. Typecheck-time name resolution

How does `RecordAccess(Var("String"), "fromInt")` resolve to the stdlib
function?

- **D1a — Desugar-time module rewrite.** In the desugarer, if the surface
  AST is `RecordAccess(Var(M), f)` where `M` is in a known-module set
  (`{String, List, Option, Result, Int, Float, Math, Array, Map, Set, JSON}`),
  rewrite to `CoreVar("M.f")`. The typechecker then looks up
  `"String.fromInt"` with existing flat-key machinery.
  - **Pros:** tiny code change; preserves current builtins layout; no
    typechecker surgery; no record-type fiction.
  - **Cons:** hardcoded module list in the desugarer; shadowing
    (`let String = "hi"; String.length`) requires a guard; doesn't
    generalize to user modules.

- **D1b — Pseudo-module records in the type env.** Register each stdlib
  module as a record whose fields are its functions. `inferRecordAccess`
  works unchanged if record fields can carry `TypeScheme`s.
  - **Pros:** modules become first-class values; `let s = String` works.
  - **Cons:** records in H-M carry monomorphic types; extending them to
    hold schemes is non-trivial type-system work; instantiation at each
    field access is new machinery.

- **D1c — Typechecker fallback in `inferRecordAccess`.** When `record` is
  `CoreVar(name)`, `name` isn't in the env, and `"name.field"` is a
  builtin, resolve via the flat key.
  - **Pros:** one-file change; respects lexical shadowing automatically.
  - **Cons:** typechecker becomes aware of the flat-key convention; layering
    violation; doesn't scale to user modules.

- **D1d — First-class module values.** New `Type` kind `TModule { fields:
  Map<string, TypeScheme> }`. Import statements bind identifiers to
  `TModule` values. `inferRecordAccess` dispatches on whether the record's
  inferred type is `TRecord` or `TModule`.
  - **Pros:** principled; works identically for stdlib and user modules;
    slots neatly into Phase 7 (re-exports, namespace imports).
  - **Cons:** real typechecker extension; new unification rules; larger
    up-front cost than D1a/c.

### D2. Runtime packaging

Where does the JS runtime find stdlib implementations at execution time?

- **D2a — Inline into each compiled file.** Follow the `ref`/`$eq`
  pattern: each compiled program gets a preamble containing the JS source
  for the subset of stdlib functions it uses. Per-compile usage tracking
  drives which helpers get inlined.
  - **Pros:** zero-config output; standalone `.js` files; no runtime dep;
    works in sandboxes/CI without node_modules.
  - **Cons:** bundle bloat for large consumers; code duplication across
    files; needs usage-tracking plumbing in codegen.
  - **Prior art:** Elm, js_of_ocaml.

- **D2b — Import from `@vibefun/std`.** `packages/stdlib` becomes a real
  package exporting curried functions. Codegen emits
  `import { String, List, … } from "@vibefun/std";` for whatever modules
  the program uses.
  - **Pros:** clean; tree-shakeable under bundlers; stdlib is a normal
    library with its own tests/docs; compiled output stays small.
  - **Cons:** runtime dep — compiled programs need `@vibefun/std`
    resolvable at run time; test harness must run where the package
    resolves (fine for monorepo; external consumers must install it).
  - **Prior art:** ReScript (`@rescript/std`), Fable (`fable-library`).

- **D2c — Hybrid `--inline-stdlib` flag.** Default to one; flag for the
  other.
  - **Pros:** flexibility across deployment contexts.
  - **Cons:** two codegen paths to test and maintain.

- **D2d — Stdlib in `.vf`, compiled ahead of time.** Write stdlib as `.vf`
  files (using `external` for JS primitives), compile to
  `packages/stdlib/dist/*.js`, ship via D2a or D2b.
  - **Pros:** dogfoods the compiler; spec signatures in one source of
    truth; builtin list becomes derivable.
  - **Cons:** chicken/egg — many Phase 3+ features must work before stdlib
    can be self-hosted (variant construction, type-alias transparency,
    generics on function declarations). Would block Phase 2 on Phase 3.

### D3. Prelude vs. explicit imports

- **D3a — Implicit prelude.** Stdlib modules are ambient. Tests and
  examples don't change.
  - **Pros:** fastest to green; matches current fixtures.
  - **Cons:** diverges from spec `08-modules` which mandates explicit
    imports.

- **D3b — Auto-injected imports.** Source has no import; compiler prepends
  `import { String, … } from "@vibefun/std";` during desugaring or codegen,
  based on usage.
  - **Pros:** test ergonomics of D3a with the runtime model of D2b.
  - **Cons:** "magic"; readers of compiled JS see imports they didn't
    write; precedence rule needed when user also imports a name.

- **D3c — Explicit required.** Every source file includes the needed
  imports. Spec-faithful.
  - **Pros:** no magic; no hardcoded module list anywhere.
  - **Cons:** ~150 test fixtures + examples need a prelude line added.

### D4. Builtin registration structure

- **D4a — Keep flat-key dict.** Grow `builtins.ts` from 46 to ~112 entries.
- **D4b — Split per module.** `typechecker/builtins/{string.ts, list.ts,
  math.ts, …}` aggregated in an index. Still flat keys at env level.
  Mirrors the runtime layout. Recommended pairing with any of the D1/D2
  options.
- **D4c — Derive from `.vf` sources.** Only meaningful with D2d.

### D5. Parameter-order and currying fixes

Scope for task 2.2 regardless of path chosen:

- Fix 33 List/Option/Result signatures to data-first per spec
  (`List.map(list, fn)`, not `List.map(fn, list)`).
- Every JS stdlib implementation must be curried to match `f(a)(b)`.
- Signature changes affect tests written against function-first builtins,
  but those tests are currently failing anyway.

## 4. Cross-Cutting Concerns

These apply to every package:

- **List-spread `concat` bug** (`desugarListWithConcats.ts:64`) is fixed by
  switching to the resolved stdlib name — the specific fix follows
  whichever D1 option is chosen.
- **Variant representation in JS.** Hand-written runtime needs tiny helpers
  (`cons`, `nil`, `some`, `none`, `ok`, `err`) to avoid duplicating the
  `{ $tag, $0, $1 }` object shape across ~20 recursive functions.
- **Impurity.** `Math.random`, `Array.set/push/pop/sort` must be callable
  only inside `unsafe {}` per spec. Typechecker needs a purity bit on the
  offending builtins; enforcement is a side task.
- **Int vs Float strict separation.** No implicit coercion. `Math.*`
  operates on `Float`. `Int.abs` / `Float.abs` are separate entries.
- **Test harness.** Spec-validation runs compiled JS via
  `spawnSync("node", ["--input-type=module"], { input: code })`
  (`tests/spec-validation/framework/helpers.ts:22`). If `@vibefun/std`
  needs to be resolvable (D2b), verify the spawn cwd resolves it via pnpm's
  workspace hoisting.

## 5. Option Packages

Coherent combinations of the orthogonal decisions.

### Package A — Inline Prelude

**D1a + D2a + D3a + D4b + D5**

Rewrite `RecordAccess(Var(M), f)` → `CoreVar("M.f")` for a known module set
in the desugarer. Implement stdlib as hand-written JS in
`codegen/es2020/stdlib-runtime/{string.ts, list.ts, math.ts, …}`. Per-compile
usage tracking: whenever `CoreVar("M.f")` reaches codegen with known `M`,
mark that helper needed; concatenate the JS source of used helpers into the
output alongside `ref`/`$eq`.

- **Pros**
  - Fastest to green: no runtime dependency, no fixture churn.
  - Zero infra risk — follows the existing `ref`/`$eq` pattern exactly.
  - Self-contained compiled artifacts (good for CI, sandboxes, bare
    scripts).
  - Dead-code elimination is trivial (only emit what's used).
- **Cons**
  - Diverges from spec `08-modules`.
  - `@vibefun/std` package becomes vestigial.
  - Hardcoded module set in desugarer; shadowing sharp edge.
  - Poor fit for future user modules.
- **Effort:** S–M (~3–4 days).

### Package B — ES Module Auto-Import

**D1a + D2b + D3b + D4b + D5**

Same desugarer rewrite as A. Build `packages/stdlib/src/{string.ts,
list.ts, …}` as a real library of curried functions. During codegen, track
referenced modules and emit
`import { String, List } from "@vibefun/std";` at the top.

- **Pros**
  - Matches spec's runtime model without forcing fixture rewrites.
  - `@vibefun/std` becomes a real library — independently tested, versioned,
    potentially publishable.
  - Smaller per-file output; tree-shakes under bundlers.
  - Aligned with ReScript and Fable.
- **Cons**
  - Runtime dep on `@vibefun/std`.
  - Auto-injected imports = magic; precedence rule needed when user also
    imports a name.
  - First-time setup to get `@vibefun/std` buildable and resolvable by the
    test harness.
- **Effort:** M (~4–6 days).

### Package C — Pseudo-Module Records

**D1b + D2a-or-b + D3a + D4b + D5**

Register each stdlib module as a record with polymorphic field schemes.
Requires extending records to hold `TypeScheme`s (real H-M extension).
Runtime can be inline (D2a) or imported (D2b).

- **Pros**
  - Most elegant: modules become first-class; `let s = String` works.
  - No hardcoded module list.
- **Cons**
  - Type-system surgery: records currently carry monomorphic types.
  - Highest implementation risk; expands Phase 2 scope significantly.
  - Could wait until Phase 3 (user types) where mechanism is shared.
- **Effort:** L (~7–10 days).

### Package D — Full Module System

**D1d + D2b + D3c + D4b/c + D5**

First-class module values in the type system. Explicit
`import { String } from "@vibefun/std";` in every source. `@vibefun/std`
implemented as a real package (TS now, optionally `.vf` later).

- **Pros**
  - Spec-faithful; no transitional state.
  - No hardcoded module list anywhere in the compiler.
  - Same mechanism serves user modules (Phase 6/7) with no extra work.
- **Cons**
  - Fixture churn across ~150 test programs and ~20 examples.
  - Real type-system extension (new `TModule` kind or equivalent).
  - Highest total effort.
- **Effort:** XL (~2–3 weeks).

## 6. Tradeoff Summary

| Dimension              | A (Inline)     | B (Import)     | C (Records)   | D (Full mods) |
|------------------------|----------------|----------------|---------------|---------------|
| Effort                 | S–M (3–4 d)    | M (4–6 d)      | L (7–10 d)    | XL (2–3 w)    |
| Fixture churn          | None           | None           | None          | ~150 files    |
| Runtime dep            | No             | Yes (std pkg)  | Yes or No     | Yes           |
| Spec alignment         | Weak           | Strong*        | Weak          | Exact         |
| Typechecker risk       | Low            | Low            | High          | Medium        |
| Compile output         | Self-contained | Imports std    | Either        | Imports std   |
| User-module fit        | Poor           | Good           | Excellent     | Excellent     |
| Bundle size            | Grows w/ use   | Constant       | Either        | Constant      |

\* B respects the spec's runtime model via auto-injection rather than
explicit source imports.

## 7. Prior Art

- **Elm** — single bundled `.js` with kernel/stdlib inlined, fully-qualified
  names, dead-code elimination. Package A shape.
- **PureScript** — per-module ES files, no runtime library, Prelude explicit
  but conventionally always imported. Close to Package D architecture.
- **ReScript** — `@rescript/std` as runtime npm dep; compiled output imports
  from it. Package B shape.
- **Fable (F# → JS)** — `fable-library` as runtime npm dep. Package B shape.
- **js_of_ocaml** — inlines OCaml stdlib into compiled output. Package A
  shape.

## 8. Chosen Direction

Based on stated preferences (runtime dep on `@vibefun/std` is acceptable,
explicit imports are the hard target), the direction is **Package D** with
the following specifics:

- **Stdlib source: hand-written TypeScript** (D-TS). `packages/stdlib/src/`
  grows into a real library with per-module files and curried function
  exports. Phase-3-independent. Migration to `.vf` self-hosting can happen
  incrementally as Phase 3+ language features land; TS implementations
  become the `external` targets of `.vf` stubs.

- **Name resolution: first-class module values** (D1d). New type-system
  concept distinct from both flat-key hacks and record extension. Imports
  bind identifiers to module values; module-access is its own inference
  rule (either a new AST node, or dispatch inside `inferRecordAccess`
  based on inferred type).

### Implications

- New `Type` kind: `TModule { fields: Map<string, TypeScheme> }` — schemes,
  not types, since modules expose polymorphic functions.
- Import statements produce bindings whose inferred type is `TModule`,
  built from a module signature. For `@vibefun/std`, the signature lives
  alongside the TS implementation; future user modules derive it from
  compiled `.vf` output.
- `getBuiltinEnv()` shrinks: currently-ambient bindings (`Cons`, `Nil`,
  `Some`, `None`, `Ok`, `Err`, `List.map`, …) move behind explicit imports.
  Language-level primitives (`panic`, `ref`) stay ambient.
- Codegen: module-access compiles to JS member access on the imported
  binding. Largely unchanged from the existing `RecordAccess` path, given
  the module value is just a JS object.

### Fixture Strategy

`tests/spec-validation/framework/helpers.ts:210-225` wraps every program
with `console_log`. Extending that wrapper to prepend
`import { String, List, Option, Result, Int, Float, Math } from "@vibefun/std";`
removes ~150 per-file edits. `examples/*.vf` get hand-edited imports (~20
files).

### Phase-Ordering Risk

First-class module values is a genuine type-system extension. Effort may
rise from the spec-analysis's ~3–5 day estimate for Phase 2 up to ~6–9
days once the type-system work is included. Worth flagging before
committing.

## 9. Open Questions Before Implementation

1. **TModule design.** New `Type` kind alongside existing
   (`TConst`, `TVar`, `TApp`, `TFun`, `TRecord`), or subtype of `TRecord`
   with scheme-valued fields? The former is cleaner; the latter reuses
   more machinery.
2. **Module-access AST.** New `ModuleAccess` Surface/Core node, or
   `RecordAccess` dispatching on inferred type at inference time? Latter
   is smaller; former is more explicit.
3. **Ambient retention.** Should variant constructors (`Some`, `None`,
   `Ok`, `Err`, `Cons`, `Nil`) stay ambient for ergonomics, or move behind
   explicit imports for consistency? Spec leans toward explicit.
4. **Re-exports.** Does `@vibefun/std` re-export a subset as a top-level
   `Prelude` module, or do consumers always name individual modules?
5. **Test-harness cwd.** Verify `spawnSync("node", …, { input: code })`
   resolves `@vibefun/std` via pnpm workspace hoisting before committing
   to D2b.

## 10. Critical Files (for the chosen direction)

- `packages/core/src/types/type.ts` — add `TModule` or equivalent.
- `packages/core/src/typechecker/builtins.ts` — refactor to per-module;
  remove ambient bindings that move behind explicit imports.
- `packages/core/src/typechecker/infer/infer-structures.ts:82-130` —
  extend `inferRecordAccess` for module values, or add `inferModuleAccess`.
- `packages/core/src/typechecker/environment.ts` — wire imports to produce
  `TModule` bindings.
- `packages/core/src/desugarer/desugarListWithConcats.ts:64` — fix
  `CoreVar("concat")` → resolved `List.concat` reference.
- `packages/core/src/module-loader/` — wire into the CLI pipeline for
  `@vibefun/std` resolution.
- `packages/core/src/codegen/es2020/generator.ts:179-322` — emit imports
  for `@vibefun/std`.
- `packages/stdlib/src/` — build out from stub to full TS implementation;
  add per-module files (`string.ts`, `list.ts`, `option.ts`, `result.ts`,
  `int.ts`, `float.ts`, `math.ts`, etc.) with curried exports.
- `tests/spec-validation/framework/helpers.ts:210-225` — extend wrapper to
  prepend stdlib imports.
- `examples/*.vf` — add explicit imports.

## 11. Verification (post-implementation)

- `pnpm run build && pnpm spec:validate --verbose` — Phase 2 tests should
  move toward passing.
- Per-module unit tests inside `packages/stdlib/` — the stdlib becomes its
  own independently tested package.
- Snapshot tests in `packages/core/src/codegen/es2020/snapshot-tests/` for
  a program calling `String.fromInt` — confirm the emitted JS contains the
  expected `import { String } from "@vibefun/std";`.
- Spot-run `examples/js-interop-overloading.vf` which already uses
  `String.fromInt`.

## Maintenance

If the chosen direction shifts, update §8 accordingly. If file paths in
§10 change, update the reference list in the same commit.
