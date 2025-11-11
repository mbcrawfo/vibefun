# Specification Improvements Context

**Last Updated:** 2025-11-03

## Background

A comprehensive review of the vibefun specification revealed that while core features (type system, pattern matching, functions, JavaScript interop) are well-documented (~70% coverage), there are significant gaps that would block compiler implementation:

### Critical Gaps Identified
1. **Tuples** - Referenced throughout but never formally defined
2. **Standard Library** - Only type signatures exist, no semantics or examples
3. **Control Flow** - Loops, async/await, try/catch status unclear
4. **Module System** - Missing initialization semantics and edge cases
5. **Expression Semantics** - Incomplete precedence and evaluation order docs

### Review Statistics
- Total spec files: 45
- Well-documented: ~70%
- Needing expansion: ~20%
- Missing: ~10%

## Key Files

### Files to Create
- `/docs/spec/03-type-system/tuples.md`
- `/docs/spec/11-standard-library/map.md`
- `/docs/spec/11-standard-library/set.md`
- `/docs/spec/11-standard-library/json.md`
- `/docs/spec/11-standard-library/math.md`

### Files to Update
- `/docs/spec/11-standard-library/list.md` - Expand from stubs
- `/docs/spec/11-standard-library/result.md` - Complete semantics
- `/docs/spec/11-standard-library/string.md` - Add examples and edge cases
- `/docs/spec/11-standard-library/int.md` - Full function documentation
- `/docs/spec/11-standard-library/float.md` - Complete API docs
- `/docs/spec/11-standard-library/array.md` - Safety and performance notes
- `/docs/spec/06-control-flow.md` - Clarify loops/async/try-catch
- `/docs/spec/08-modules.md` - Add initialization and edge cases
- `/docs/spec/04-expressions/basic-expressions.md` - Precedence examples
- `/docs/spec/07-mutable-references.md` - Clarify ref syntax

## Inconsistencies to Resolve

1. **Ref creation syntax**: Some examples show `let mut x = ref(10)`, unclear if `mut` is required
2. **Empty list type**: Documentation says `[]` is polymorphic but also mentions value restriction
3. **String concatenation**: Is `&` a primitive or sugar for `String.concat`?
4. **Function type notation**: Mix of `(A, B) -> C` and `(A) -> (B) -> C` in examples

## Design Decisions Needed

- **Tuples vs Records**: Are tuples sugar for numbered record fields or distinct?
- **Loops**: Should while/for be specified or removed (use recursion only)?
- **Async/Await**: Reserved keywords - supported now or future feature?
- **Try/Catch**: JavaScript interop only or language feature?

## References

- Original review: Task output from comprehensive spec analysis
- Spec location: `/docs/spec/`
- Standards: `.claude/DOCUMENTATION_RULES.md`
