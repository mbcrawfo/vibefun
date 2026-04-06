# Group 9: Pattern Matching Completeness

## Root Issue
Several pattern matching features are incomplete or missing: or-pattern validation, nested or-pattern expansion, guard-aware exhaustiveness, and unreachable pattern detection.

## Affected Sections
05-pattern-matching

## Affected Tests (count)
4 tests directly.

## Details
1. **Or-pattern variable binding validation** (Small): The spec says `Some(x) | None` should be rejected because `x` is bound in one branch but not the other. The compiler currently accepts this silently.

2. **Nested or-pattern expansion** (Medium): Or-patterns inside constructors (e.g., `Ok("a" | "b")`) crash with an internal error because the desugarer only expands top-level or-patterns. Needs recursive distribution.

3. **Guards in exhaustiveness** (Small-Medium): Guarded patterns are incorrectly treated as catch-alls. A match with only guarded variable patterns should be flagged as non-exhaustive.

4. **Unreachable pattern detection** (Medium): No reachability analysis exists. A wildcard pattern followed by more specific patterns should produce a warning/error.

## Individual Failures
- **05**: 2 tests (or-pattern validation, nested or-pattern), 1 test (guards exhaustiveness), 1 test (unreachable pattern)

## Estimated Fix Scope
Medium (2-8 hours total). Each sub-issue is small to medium individually. They share the pattern analysis infrastructure.
