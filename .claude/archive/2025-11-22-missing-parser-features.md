# Missing Parser Features

This document tracks parser features that are documented in the spec but not yet implemented.

**Last Updated**: 2025-11-22

## External Type Declarations

### Generic External Type Declarations - NOT IMPLEMENTED

**Spec Reference**: `docs/spec/10-javascript-interop/external-declarations.md:422-428`

**Description**: The spec shows generic type declarations within external blocks:

```vibefun
external {
    type Promise<T> = {
        then: <U>((T) -> U) -> Promise<U>,
        catch: ((Error) -> T) -> Promise<T>
    };
}
```

**Current Status**: The parser only supports generic type parameters for external **value** declarations, not external **type** declarations.

**Workaround**: Use generic types that reference existing generic type definitions:

```vibefun
// This works - referencing a generic type
external {
    type UserPromise = Promise<User>;
}

// This doesn't work - defining a new generic type
external {
    type Box<T> = { value: T };  // Parser error: Expected '=' after type name
}
```

**Impact**: Medium - generic external types can still be referenced, just not defined within external blocks.

**Implementation Notes**:
- Parser file: `packages/core/src/parser/parse-declarations.ts`
- Function: `parseExternalBlockItem`
- Line ~630: Type parsing doesn't check for optional type parameters before `=`
- Would need to add `parseTypeParameters(parser)` similar to external value declarations

---

## Status Summary

- **Total Missing Features**: 1
- **High Priority**: 0
- **Medium Priority**: 1
- **Low Priority**: 0

## Notes

- Most test scenarios from the original plan are already implemented
- Missing features are edge cases rather than core functionality
- String escape sequences and float literals are well-tested in the lexer
- Multi-line syntax is well-tested in multi-line-variants.test.ts
