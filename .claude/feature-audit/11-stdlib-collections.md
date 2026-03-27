# Feature Audit: Standard Library - Array, Collections, JSON

**Spec files**: 11-stdlib/array.md, 11-stdlib/collections.md, 11-stdlib/json.md
**Date**: 2026-03-26
**Test directory**: /tmp/vf-audit-stdlib-collections/

## Results

### Array Module

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | `Array.make` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 2 | `Array.fromList` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 3 | `Array.empty` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 4 | `Array.get` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 5 | `Array.set` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 6 | `Array.length` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 7 | `Array.map` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 8 | `Array.filter` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 9 | `Array.fold` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 10 | `Array.toList` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 11 | `Array.slice` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 12 | `Array.push` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 13 | `Array.pop` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 14 | `Array.reverse` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |
| 15 | `Array.sort` | array.md | positive | FAIL | `Undefined variable 'Array'` -- namespace not bound |

### Map Module

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | `Map.empty` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 17 | `Map.fromList` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 18 | `Map.get` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 19 | `Map.has` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 20 | `Map.size` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 21 | `Map.set` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 22 | `Map.delete` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 23 | `Map.update` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 24 | `Map.map` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 25 | `Map.filter` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 26 | `Map.fold` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 27 | `Map.keys` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 28 | `Map.values` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |
| 29 | `Map.toList` | collections.md | positive | FAIL | `Undefined variable 'Map'` -- namespace not bound |

### Set Module

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 30 | `Set.empty` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 31 | `Set.fromList` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 32 | `Set.singleton` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 33 | `Set.has` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 34 | `Set.size` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 35 | `Set.isEmpty` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 36 | `Set.add` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 37 | `Set.delete` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 38 | `Set.union` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 39 | `Set.intersect` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 40 | `Set.diff` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 41 | `Set.isSubset` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 42 | `Set.filter` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 43 | `Set.fold` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |
| 44 | `Set.toList` | collections.md | positive | FAIL | `Undefined variable 'Set'` -- namespace not bound |

### JSON Module

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 45 | `JSON.parse` (uppercase) | json.md | positive | FAIL | `Undefined variable 'JSON'` -- namespace not bound |
| 45b | `Json.parse` (mixed case) | json.md | positive | FAIL | `Undefined variable 'Json'` -- namespace not bound |
| 46 | `JSON.stringify` (uppercase) | json.md | positive | FAIL | `Undefined variable 'JString'` -- JSON variant constructors not defined |
| 46b | `Json.stringify` (mixed case) | json.md | positive | FAIL | `Undefined variable 'JString'` -- JSON variant constructors not defined |
| 47 | `JNull` constructor | json.md | positive | FAIL | `Undefined variable 'JNull'` -- JSON type not defined |
| 48 | `JBool` constructor | json.md | positive | FAIL | `Undefined variable 'JBool'` -- JSON type not defined |
| 49 | `JNumber` constructor | json.md | positive | FAIL | `Undefined variable 'JNumber'` -- JSON type not defined |
| 50 | `JString` constructor | json.md | positive | FAIL | `Undefined variable 'JString'` -- JSON type not defined |
| 51 | `JArray` constructor | json.md | positive | FAIL | `Undefined variable 'JArray'` -- JSON type not defined |

## Summary

- **Total**: 51 tests (46 spec features + 5 additional variant/casing checks)
- **Pass**: 0
- **Fail**: 51

### Root Cause

All 46 spec'd features fail with the same root cause: **namespace module variables (`Array`, `Map`, `Set`, `JSON`/`Json`) are not bound in the compiler's type environment**. The compiler reports `error[VF4100]: Undefined variable 'X'` for every namespace access.

This is a known issue (documented in the audit instructions). The standard library modules for Array, Map, Set, and JSON are specified in `docs/spec/11-stdlib/` but their namespace bindings have not been implemented in the compiler. None of the functions in these modules can be used in `.vf` programs.

Additionally, the JSON variant type constructors (`JNull`, `JBool`, `JNumber`, `JString`, `JArray`, `JObject`) are not available as built-in types/constructors. The entire JSON type system described in the spec is unimplemented.

For reference, the `List` namespace is also not bound (`Undefined variable 'List'`), confirming this is a systemic issue across all stdlib namespace modules.
