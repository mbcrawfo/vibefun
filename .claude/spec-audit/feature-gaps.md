# Feature Gaps — Vibefun Spec ↔ Implementation

Aggregate of all `❌ Missing` and `⚠️ Partial` features across the per-section audits. Each entry cites the per-section doc and F-NN ID for traceability.

## Summary

- Total ❌ Missing: 60
- Total ⚠️ Partial: 20
- Sections with 0 gaps: 02 Lexical Structure, 04a Expressions Core, 04b Expressions Data/Fns, 06 Functions, 09 Error Handling, 11a Stdlib Core, cross-cutting
- Sections with most gaps: 11b Stdlib Extra (56), 03c Types/Errors (10), 13 Appendix (6)

## Priority Tiers

Severity is a **hint**, not a verdict. Final remediation order is up to the maintainer.

- **P1 — User-visible runtime divergence or wrong behavior**: spec says X, code does Y, runs without error. Highest risk.
- **P2 — Compiler-rejecting bug**: spec says X is valid, compiler errors on it. Or vice-versa: spec says X is rejected, compiler accepts it.
- **P3 — Cosmetic / internal**: missing diagnostic message text, missing error-code mapping, untested edge case implementation, doc-only mismatch.

(Use your judgment per-entry. When unclear, default P2.)

## Gaps by Section

### 03a Types Core

- **F-36** (`03a-types-core.md`) — Recursive type aliases forbidden (must use variant types): parser accepts type aliases without a recursion check; behavior of recursive alias expansion at typecheck time is unverified. Status: ⚠️ Partial. Tier: P2. Remediation hint: confirm the typechecker rejects recursive aliases (expected error VF-TBD); add an E2E spec-validation case demonstrating rejection.

### 03b Types Composite

- **F-15** (`03b-types-composite.md`) — General union types (limited support): unification handles `|`-typed unions element-wise, but there is no special inference or pattern-matching support and pure-Vibefun behavior is not spec-validated. Status: ⚠️ Partial. Tier: P2. Remediation hint: add E2E coverage exercising general unions in pure Vibefun expressions; document remaining inference limits or extend inference to match the spec's intent.

### 03c Types — Errors / Diagnostics

- **F-03** (`03c-types-errors.md`) — Deterministic Error Order: relies on JS Map insertion order; no explicit test asserts that the same source produces errors in identical order across runs. Status: ⚠️ Partial. Tier: P3. Remediation hint: add a regression test that compiles a multi-error fixture twice and compares ordered diagnostic output.
- **F-04** (`03c-types-errors.md`) — Multi-Error Reporting: typechecker throws on first error; only the module resolver batches multiple errors. No test verifies typechecker emits 2+ errors per pass. Status: ⚠️ Partial. Tier: P3. Remediation hint: spec says MAY, so behavior is compliant; either add a test or document the eager-throw decision in the spec/architecture docs.
- **F-05** (`03c-types-errors.md`) — Cascading Error Avoidance: spec describes an error-type-based cascade-suppression strategy; not implemented (eager throw used instead). Status: ⚠️ Partial. Tier: P2. Remediation hint: either implement error-type unification per spec, or revise the spec to reflect the chosen eager-throw strategy.
- **F-11** (`03c-types-errors.md`) — Type Display Convention: type rendering lives in the typechecker, not diagnostics; no centralized check that primitives render as `Int`, `String`, etc. per spec. Status: ⚠️ Partial. Tier: P3. Remediation hint: add unit tests on `typeToString` (or equivalent) verifying primitive display strings match spec.
- **F-12** (`03c-types-errors.md`) — Type Variable Naming (`'a`, `'b`, …): no explicit naming function in diagnostics; consistency across an error message is untested. Status: ⚠️ Partial. Tier: P3. Remediation hint: add unit tests verifying type variable renaming is sequential and stable within a single error.
- **F-13** (`03c-types-errors.md`) — Error Type Behavior: spec defines an "error type" that unifies with anything to suppress cascades; not implemented. Status: ❌ Missing. Tier: P2. Remediation hint: implement the error-type unification rule, or amend spec to drop it (eager-throw makes it moot).
- **F-14** (`03c-types-errors.md`) — Primary vs Derived Errors: spec mandates classification + suppression of derived errors; not implemented. Status: ❌ Missing. Tier: P2. Remediation hint: add classification + suppression layer, or align spec with eager-throw approach.
- **F-15** (`03c-types-errors.md`) — Recovery by Error Type Table: spec prescribes 9 specific recovery actions; none implemented. Status: ❌ Missing. Tier: P2. Remediation hint: implement targeted recovery per error kind, or amend spec.
- **F-16** (`03c-types-errors.md`) — Cascading Prevention Strategy (3 mechanisms): spec lists tracking error types, suppression, grouping; none implemented. Status: ❌ Missing. Tier: P2. Remediation hint: implement or amend spec.
- **F-18** (`03c-types-errors.md`) — IDE Integration (structured output, JSON serialization): diagnostic structure is in place; JSON output / IDE-tooling integration not tested. Status: ⚠️ Partial. Tier: P3. Remediation hint: add a JSON serialization test for `VibefunDiagnostic` and a CLI flag/test for machine-readable output.

### 05 Pattern Matching

- **F-35** (`05-pattern-matching.md`) — Exhaustiveness Checking — Tuples: only basic tuple exhaustiveness via catch-all; pairwise element-wise exhaustiveness deferred (Phase 5.2). Status: ⚠️ Partial. Tier: P2. Remediation hint: implement element-wise exhaustiveness for tuple scrutinees, or document Phase 5.1 limit in user docs.

### 07 Mutable References

- **F-11** (`07-mutable-references.md`) — Pattern matching on refs forbidden without explicit dereference: enforced indirectly by type unification (no dedicated error code/message). Status: ⚠️ Partial. Tier: P3. Remediation hint: add a dedicated diagnostic that flags direct match on `Ref<…>` with a hint to dereference; add an E2E test capturing the message.

### 08 Modules

- **F-30** (`08-modules.md`) — Module initialization for circular dependencies (deferred / undefined bindings): cycle detector + warnings exist; no test validates the spec's claim that calling a circularly-imported function at module top level fails at initialization time. Status: ⚠️ Partial. Tier: P2. Remediation hint: add an E2E test that asserts top-level invocation across a cycle errors with the expected runtime message.

### 10 JavaScript Interop

- **F-30** (`10-javascript-interop.md`) — Arity-based external overload resolution at call site: parser/typechecker accept multiple `external` declarations of the same name, but call-site resolution throws VF4804 ("not yet supported"). Status: ⚠️ Partial. Tier: P2. Remediation hint: implement arity-based selection in `infer/infer-primitives.ts` and add unit + spec-validation coverage; until then, mark the feature explicitly unsupported in user docs.

### 12 Compilation

- **F-19** (`12-compilation.md`) — Source maps support: `--source-maps` flag is documented in CLI docs but not implemented in `packages/cli/src/commands/compile.ts` or codegen. Status: ⚠️ Partial. Tier: P1. Remediation hint: implement source map emission (or remove the flag from CLI docs); generated JS today does not produce source maps despite documentation promising it.
- **F-46** (`12-compilation.md`) — Runtime type checking (`--runtime-checks=ffi|all|none`): described in spec; not implemented in CLI. Status: ⚠️ Partial. Tier: P1. Remediation hint: implement runtime-check insertion at FFI boundaries (or remove from spec); user-facing flag is currently a phantom.

### 13 Appendix

- **F-25** (`13-appendix.md`) — Keywords table completeness: implementation supports all 18 documented keywords plus `try` and `catch`; appendix keywords table omits `try` and `catch`. Status: ⚠️ Partial. Tier: P3. Remediation hint: add `try` and `catch` rows to the keywords table at `docs/spec/13-appendix.md:60-81`.
- **F-37** (`13-appendix.md`) — Try-catch expression (undocumented in syntax summary): implemented and tested but missing from `docs/spec/13-appendix.md:19-58` syntax summary. Status: ⚠️ Partial. Tier: P3. Remediation hint: add `try { … } catch (e) { … }` to the syntax summary examples.
- **F-38** (`13-appendix.md`) — While loop (undocumented in syntax summary): implemented and tested but missing from syntax summary. Status: ⚠️ Partial. Tier: P3. Remediation hint: add `while condition { body }` to the syntax summary examples.
- **F-39** (`13-appendix.md`) — Try-catch and while keywords (missing from appendix keywords table): `try`/`catch` already noted; ensure `while` is documented with its purpose. Status: ⚠️ Partial. Tier: P3. Remediation hint: ensure all three keywords appear with descriptions in the keywords table.
- **F-49** (`13-appendix.md`) — Try-catch implemented but not in `future-features.md` nor syntax summary: documentation alignment issue. Status: ⚠️ Partial (Unexpected Positive). Tier: P3. Remediation hint: pick one home (syntax summary) and document there.
- **F-50** (`13-appendix.md`) — While loop implemented but not in syntax summary: documentation alignment issue. Status: ⚠️ Partial (Unexpected Positive). Tier: P3. Remediation hint: same as F-38; add `while condition { body }` to the syntax summary.

### 11b Stdlib Extra

> See the **Critical Cluster** section below for a high-level summary. Listed individually for traceability.

#### Array module (entirely unimplemented — 15 functions)

- **F-39** (`11b-stdlib-extra.md`) — `Array.make`: create array of fixed size with default value (`<T>(Int, T) -> Array<T>`). Status: ❌ Missing. Tier: P1. Remediation hint: implement Array module from scratch in `packages/stdlib/src/array.ts` and register signatures.
- **F-40** (`11b-stdlib-extra.md`) — `Array.fromList`: convert list to array. Status: ❌ Missing. Tier: P1.
- **F-41** (`11b-stdlib-extra.md`) — `Array.empty`: create empty array. Status: ❌ Missing. Tier: P1.
- **F-42** (`11b-stdlib-extra.md`) — `Array.get`: safe indexed access returning `Option`. Status: ❌ Missing. Tier: P1.
- **F-43** (`11b-stdlib-extra.md`) — `Array.set`: mutating update at index. Status: ❌ Missing. Tier: P1.
- **F-44** (`11b-stdlib-extra.md`) — `Array.length`: get array length. Status: ❌ Missing. Tier: P1.
- **F-45** (`11b-stdlib-extra.md`) — `Array.map`: pure transform. Status: ❌ Missing. Tier: P1.
- **F-46** (`11b-stdlib-extra.md`) — `Array.filter`: pure filter. Status: ❌ Missing. Tier: P1.
- **F-47** (`11b-stdlib-extra.md`) — `Array.fold`: pure fold. Status: ❌ Missing. Tier: P1.
- **F-48** (`11b-stdlib-extra.md`) — `Array.toList`: convert array to list. Status: ❌ Missing. Tier: P1.
- **F-49** (`11b-stdlib-extra.md`) — `Array.slice`: extract subarray. Status: ❌ Missing. Tier: P1.
- **F-50** (`11b-stdlib-extra.md`) — `Array.push`: mutating append. Status: ❌ Missing. Tier: P1.
- **F-51** (`11b-stdlib-extra.md`) — `Array.pop`: mutating pop returning `Option`. Status: ❌ Missing. Tier: P1.
- **F-52** (`11b-stdlib-extra.md`) — `Array.reverse`: in-place reverse. Status: ❌ Missing. Tier: P1.
- **F-53** (`11b-stdlib-extra.md`) — `Array.sort`: in-place sort with comparator. Status: ❌ Missing. Tier: P1.

#### Map module (entirely unimplemented — 14 functions)

- **F-54** (`11b-stdlib-extra.md`) — `Map.empty`: create empty map. Status: ❌ Missing. Tier: P1. Remediation hint: implement Map module in `packages/stdlib/src/collections/map.ts` and register signatures.
- **F-55** (`11b-stdlib-extra.md`) — `Map.fromList`: build map from list of pairs. Status: ❌ Missing. Tier: P1.
- **F-56** (`11b-stdlib-extra.md`) — `Map.get`: lookup returning `Option`. Status: ❌ Missing. Tier: P1.
- **F-57** (`11b-stdlib-extra.md`) — `Map.has`: key membership. Status: ❌ Missing. Tier: P1.
- **F-58** (`11b-stdlib-extra.md`) — `Map.size`: number of entries. Status: ❌ Missing. Tier: P1.
- **F-59** (`11b-stdlib-extra.md`) — `Map.set`: immutable insert/update. Status: ❌ Missing. Tier: P1.
- **F-60** (`11b-stdlib-extra.md`) — `Map.delete`: immutable remove. Status: ❌ Missing. Tier: P1.
- **F-61** (`11b-stdlib-extra.md`) — `Map.update`: update value with function over `Option<V>`. Status: ❌ Missing. Tier: P1.
- **F-62** (`11b-stdlib-extra.md`) — `Map.map`: transform values. Status: ❌ Missing. Tier: P1.
- **F-63** (`11b-stdlib-extra.md`) — `Map.filter`: filter entries. Status: ❌ Missing. Tier: P1.
- **F-64** (`11b-stdlib-extra.md`) — `Map.fold`: fold over entries. Status: ❌ Missing. Tier: P1.
- **F-65** (`11b-stdlib-extra.md`) — `Map.keys`: list of keys. Status: ❌ Missing. Tier: P1.
- **F-66** (`11b-stdlib-extra.md`) — `Map.values`: list of values. Status: ❌ Missing. Tier: P1.
- **F-67** (`11b-stdlib-extra.md`) — `Map.toList`: convert to list of pairs. Status: ❌ Missing. Tier: P1.

#### Set module (entirely unimplemented — 15 functions)

- **F-68** (`11b-stdlib-extra.md`) — `Set.empty`: empty set. Status: ❌ Missing. Tier: P1. Remediation hint: implement Set module in `packages/stdlib/src/collections/set.ts` and register signatures.
- **F-69** (`11b-stdlib-extra.md`) — `Set.fromList`: build set from list. Status: ❌ Missing. Tier: P1.
- **F-70** (`11b-stdlib-extra.md`) — `Set.singleton`: single-element set. Status: ❌ Missing. Tier: P1.
- **F-71** (`11b-stdlib-extra.md`) — `Set.has`: membership check. Status: ❌ Missing. Tier: P1.
- **F-72** (`11b-stdlib-extra.md`) — `Set.size`: number of elements. Status: ❌ Missing. Tier: P1.
- **F-73** (`11b-stdlib-extra.md`) — `Set.isEmpty`: emptiness check. Status: ❌ Missing. Tier: P1.
- **F-74** (`11b-stdlib-extra.md`) — `Set.add`: immutable add. Status: ❌ Missing. Tier: P1.
- **F-75** (`11b-stdlib-extra.md`) — `Set.delete`: immutable remove. Status: ❌ Missing. Tier: P1.
- **F-76** (`11b-stdlib-extra.md`) — `Set.union`: union of two sets. Status: ❌ Missing. Tier: P1.
- **F-77** (`11b-stdlib-extra.md`) — `Set.intersect`: intersection. Status: ❌ Missing. Tier: P1.
- **F-78** (`11b-stdlib-extra.md`) — `Set.diff`: difference. Status: ❌ Missing. Tier: P1.
- **F-79** (`11b-stdlib-extra.md`) — `Set.isSubset`: subset check. Status: ❌ Missing. Tier: P1.
- **F-80** (`11b-stdlib-extra.md`) — `Set.filter`: predicate filter. Status: ❌ Missing. Tier: P1.
- **F-81** (`11b-stdlib-extra.md`) — `Set.fold`: fold over set. Status: ❌ Missing. Tier: P1.
- **F-82** (`11b-stdlib-extra.md`) — `Set.toList`: convert to list. Status: ❌ Missing. Tier: P1.

#### JSON module (entirely unimplemented — 12 functions + type)

- **F-83** (`11b-stdlib-extra.md`) — JSON type definition: `type JSON = | JNull | JBool(Bool) | JNumber(Float) | JString(String) | JArray(List<JSON>) | JObject(Map<String, JSON>)`. Status: ❌ Missing. Tier: P1. Remediation hint: depends on F-54 (Map) — implement Map first, then add JSON module.
- **F-84** (`11b-stdlib-extra.md`) — `JSON.parse`: `(String) -> Result<JSON, String>`. Status: ❌ Missing. Tier: P1.
- **F-85** (`11b-stdlib-extra.md`) — `JSON.stringify`: `(JSON) -> String`. Status: ❌ Missing. Tier: P1.
- **F-86** (`11b-stdlib-extra.md`) — `JSON.stringifyPretty`: pretty-print with indentation. Status: ❌ Missing. Tier: P1.
- **F-87** (`11b-stdlib-extra.md`) — `JSON.asNull`: `(JSON) -> Option<Unit>`. Status: ❌ Missing. Tier: P1.
- **F-88** (`11b-stdlib-extra.md`) — `JSON.asBool`: `(JSON) -> Option<Bool>`. Status: ❌ Missing. Tier: P1.
- **F-89** (`11b-stdlib-extra.md`) — `JSON.asNumber`: `(JSON) -> Option<Float>`. Status: ❌ Missing. Tier: P1.
- **F-90** (`11b-stdlib-extra.md`) — `JSON.asString`: `(JSON) -> Option<String>`. Status: ❌ Missing. Tier: P1.
- **F-91** (`11b-stdlib-extra.md`) — `JSON.asArray`: `(JSON) -> Option<List<JSON>>`. Status: ❌ Missing. Tier: P1.
- **F-92** (`11b-stdlib-extra.md`) — `JSON.asObject`: `(JSON) -> Option<Map<String, JSON>>`. Status: ❌ Missing. Tier: P1.
- **F-93** (`11b-stdlib-extra.md`) — `JSON.getField`: `(JSON, String) -> Option<JSON>`. Status: ❌ Missing. Tier: P1.
- **F-94** (`11b-stdlib-extra.md`) — `JSON.getFieldAs`: typed field extraction. Status: ❌ Missing. Tier: P1.

## Critical Cluster: Missing Stdlib Modules

`11b-stdlib-extra.md` reports **four entire stdlib modules unimplemented (Array, Map, Set, JSON — 56 functions / type definitions)**. Treat this as a P1 cluster — these are spec-defined APIs that user code can attempt to import and they will fail. Per-module summary:

- **Array** (15 functions, F-39 → F-53) — construction (`make`, `fromList`, `empty`), access (`get`, `length`), mutation (`set`, `push`, `pop`, `reverse`, `sort`), pure transformation (`map`, `filter`, `fold`, `toList`, `slice`).
- **Map** (14 functions, F-54 → F-67) — construction (`empty`, `fromList`), access (`get`, `has`, `size`), immutable modification (`set`, `delete`, `update`), transformation (`map`, `filter`, `fold`), conversion (`keys`, `values`, `toList`).
- **Set** (15 functions, F-68 → F-82) — construction (`empty`, `fromList`, `singleton`), access (`has`, `size`, `isEmpty`), immutable modification (`add`, `delete`), set ops (`union`, `intersect`, `diff`, `isSubset`), transformation (`filter`, `fold`, `toList`).
- **JSON** (1 type + 12 functions, F-83 → F-94) — `JSON` discriminated union, parse/stringify, accessor extractors (`asNull`, `asBool`, `asNumber`, `asString`, `asArray`, `asObject`), field access (`getField`, `getFieldAs`). Depends on Map.

See `.claude/spec-audit/11b-stdlib-extra.md` for full per-function spec references and signatures.

## Notes on Tier Distribution

The vast majority of P1 gaps (58 of ~62) sit inside the stdlib cluster — four spec-defined modules that don't exist yet. Outside the stdlib cluster, only two non-stdlib P1 issues exist: `--source-maps` and `--runtime-checks` are documented user-facing CLI flags with no implementation. The P2 tier is dominated by the type-system error-recovery model (03c F-13/F-14/F-15/F-16): the spec describes a sophisticated cascading-prevention mechanism that the eager-throw implementation simply doesn't provide — the best fix may be to amend the spec rather than build the machinery. P3 gaps are largely documentation alignment in the appendix and missing tests around determinism/IDE integration.
