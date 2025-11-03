# Ref Variables Documentation Context

**Last Updated:** 2025-11-03

## Key Files
- `vibefun-spec.md` - Main language specification (PRIMARY FILE TO UPDATE)
- `packages/core/src/types/ast.ts` - AST definitions showing UnaryOp (Deref, LogicalNot) and BinaryOp (RefAssign)
- `packages/core/src/lexer/lexer-integration.test.ts` - Contains comprehensive ref usage examples

## Current State of Ref Documentation

### What Exists (Minimal)
- Keywords section: `ref` listed as reserved keyword
- Operators section: Brief mentions of `:=` and `!`
- Syntax summary: Single line `let mut name = ref(value)`
- No examples, no rationale, no type system integration

### What's Missing (Critical Gaps)
- No dedicated section on mutable references
- `Ref<T>` type not documented in Type System section
- Zero working examples in the spec
- No explanation of when/why to use refs
- Type checking rules not documented
- `!` operator ambiguity not explained
- No design philosophy or guidance

## Implementation Details

### Type System
From `packages/core/src/types/type.ts`:
```typescript
export function refType(elementType: Type): Type {
    return appType(constType("Ref"), [elementType]);
}
```
Refs are `Ref<T>` parameterized types.

### AST Operators
From `packages/core/src/types/ast.ts`:
```typescript
export type UnaryOp =
    | "Negate"      // -x
    | "LogicalNot"  // !x (on Bool)
    | "Deref";      // !x (on Ref<T>)

export type BinaryOp =
    | "RefAssign"   // x := y
    // ... other operators
```

### Test Examples
Comprehensive examples exist in `lexer-integration.test.ts`:
- Basic counter with ref(0)
- Factorial using while loop
- Refs with variant types (Option)
- Multiple refs coordination

## Design Decisions Confirmed
1. **`mut` required**: All refs must use `let mut x = ref(value)`
2. **Type-based `!`**: Compiler infers logical NOT vs deref from operand type
3. **`ref` is special syntax**: Not a regular function, keyword-based
4. **Philosophy**: Use for imperative algorithms & JS interop; generally discouraged

## Documentation Strategy

### Section Organization
1. **New Section**: "Mutable References" (comprehensive coverage)
2. **Type System Update**: Add `Ref<T>` to types list
3. **Operators Enhancement**: Expand `:=` and `!` descriptions
4. **Syntax Reference**: Add complete examples

### Writing Approach
- Start with "why refs exist" (pragmatic escape hatch)
- Explain "when to use" vs "when to avoid"
- Show syntax progression: create → read → update
- Include realistic examples (not just counters)
- Clarify `!` ambiguity explicitly
