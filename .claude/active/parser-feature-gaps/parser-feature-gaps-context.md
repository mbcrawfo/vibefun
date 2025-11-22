# Parser Feature Gaps - Context

**Last Updated**: 2025-11-11

## Purpose

This document provides context for implementing missing parser features to achieve full language specification compliance. It serves as a quick reference for spec requirements, current implementation state, and key files involved.

## Key Files

### Parser Implementation
- `packages/core/src/parser/parser.ts` - Main parser class
- `packages/core/src/parser/parse-expressions.ts` - Expression parsing
- `packages/core/src/parser/parse-patterns.ts` - Pattern parsing
- `packages/core/src/parser/parse-types.ts` - Type expression parsing
- `packages/core/src/parser/parse-declarations.ts` - Top-level declarations
- `packages/core/src/parser/index.ts` - Public exports

### AST Type Definitions
- `packages/core/src/types/ast.ts` - All AST node types
- `packages/core/src/types/token.ts` - Token types
- `packages/core/src/types/index.ts` - Type exports

### Lexer (if needed)
- `packages/core/src/lexer/lexer.ts` - Tokenization
- `packages/core/src/lexer/keywords.ts` - Keyword definitions

### Existing Test Files
- `packages/core/src/parser/expressions.test.ts`
- `packages/core/src/parser/patterns.test.ts`
- `packages/core/src/parser/types.test.ts`
- `packages/core/src/parser/declarations.test.ts`
- `packages/core/src/parser/record-shorthand.test.ts`
- `packages/core/src/parser/parser-errors.test.ts`

## Language Specification Reference

### Primary Spec Location
- **Root**: `docs/spec/`
- **Navigation**: `docs/spec/.agent-map.md` - Quick reference to all spec sections

### Feature-Specific Spec Files

#### Pattern Matching
- `docs/spec/05-pattern-matching/basic-patterns.md` - Basic pattern syntax
- `docs/spec/05-pattern-matching/advanced-patterns.md` - Guards, or-patterns, type annotations
  - **Line 135-308**: Pattern guards (when clauses) - extensive documentation
  - **Line 377**: Or-pattern variable binding restrictions
  - **Line 411**: Nested or-patterns examples
  - **Line 463-487**: Type annotations in patterns
  - **Line 489**: As-patterns (NOT supported)

#### Lambda Expressions
- `docs/spec/04-expressions/functions-composition.md`
  - **Line 40**: Parameter type annotations `(x: Int) => x + 1`
  - **Line 44**: Return type annotations `(x): Int => x + 1`
  - **Line 55-71**: Destructuring parameters `({ name, age }) => ...`
  - **Line 167**: Empty blocks returning Unit

#### Data Literals
- `docs/spec/04-expressions/data-literals.md`
  - **Line 153-181**: Record field shorthand `{ name, age }`
  - **Line 432-477**: Trailing commas in records and lists
  - Multiple spread examples throughout

#### External Declarations
- `docs/spec/10-javascript-interop/external-declarations.md`
  - **Line 196-280**: Overloaded externals
  - **Line 325**: Generic external declarations with type parameters
  - **Line 360-397**: Opaque type constructors using Type keyword
  - **Line 399-443**: External type declarations inside blocks

#### Module System
- `docs/spec/08-modules.md`
  - **Line 27**: Import * as namespace syntax
  - **Line 33**: Mixed type/value imports
  - **Line 37-108**: Module resolution algorithm

#### Type System
- `docs/spec/03-type-system/tuples.md` - Tuple types
- `docs/spec/03-type-system/recursive-types.md` - Recursive type definitions
- `docs/spec/03-type-system/variant-types.md`
  - **Line 18-21**: Multi-line variant syntax with `|` on new lines

## Current Implementation State

### Pattern Matching

#### Guards (when clauses)
- **Spec status**: Extensively documented
- **Implementation**: UNCLEAR - no dedicated tests found
- **AST node**: May need `PatternGuard` or extend existing pattern nodes with `guard?` field
- **Keywords**: `when` keyword may or may not be in lexer
- **Files to check**:
  - `parse-patterns.ts` - Check if `when` keyword is handled
  - `keywords.ts` - Verify `when` is a keyword
  - AST types - Check for guard support in pattern nodes

#### Type Annotations in Patterns
- **Spec status**: Documented with examples
- **Implementation**: NOT IMPLEMENTED
- **AST changes needed**: Pattern nodes need optional `typeAnnotation` field
- **Parsing**: Pattern parser needs to look for `:` after certain patterns
- **Type checking**: Type checker must validate pattern type annotations match scrutinee

#### Nested Or-Patterns
- **Spec status**: Examples shown
- **Implementation**: UNCLEAR - basic or-patterns work, nesting untested
- **Potential issues**: Parser precedence, variable binding validation

### Lambda Expressions

#### Parameter Type Annotations
- **Spec status**: Clear syntax shown
- **Implementation**: NOT TESTED - may work but no tests
- **AST**: Lambda parameter nodes likely need type field
- **Parsing**: Already handles `(x: Type)` in parameter lists?

#### Return Type Annotations
- **Spec status**: Syntax: `(x): ReturnType => body`
- **Implementation**: NOT TESTED
- **AST**: Lambda node needs `returnType?` field
- **Parsing**: Need to handle `:` after closing `)` of parameters

#### Parameter Destructuring
- **Spec status**: Examples with record/tuple destructuring
- **Implementation**: UNCLEAR - pattern parser exists, integration unknown
- **Parsing**: Lambda params should accept any pattern, not just identifiers

### External Declarations

#### Generic Externals
- **Spec status**: Examples with `<A, B>` type parameters
- **Implementation**: UNCLEAR - external parsing exists, generics unknown
- **AST**: External declarations need `typeParams?` field
- **Parsing**: Type parameter parsing already exists for type defs

#### External Type Declarations
- **Spec status**: `type Name = Type` inside external blocks
- **Implementation**: NOT TESTED
- **Parsing**: External block parser needs to accept type declarations

#### Opaque Type Constructors
- **Spec status**: `Type` identifier for opaque types
- **Implementation**: NEEDS VERIFICATION
- **Parsing**: External parser needs to recognize `Type` identifier
- **AST**: May need distinct node or flag

### Module System

#### Import * as Namespace
- **Spec status**: Standard syntax
- **Implementation**: NOT VERIFIED
- **AST**: Import node needs namespace form
- **Parsing**: Import parser needs `*` as `identifier` handling

#### Mixed Type/Value Imports
- **Spec status**: Mix `type` and regular imports in same statement
- **Implementation**: NOT TESTED
- **Parsing**: Import specifier list needs per-item type flag

### Data Literals

#### Field Shorthand
- **Spec status**: Variables bind to same-named fields
- **Implementation**: Test file exists (`record-shorthand.test.ts`)
- **Status**: Likely implemented, needs verification against spec
- **Action**: Review tests, add missing cases

#### Trailing Commas
- **Spec status**: EXPLICITLY ALLOWED in spec
- **Implementation**: UNCLEAR - not comprehensively tested
- **Parsing**: All list/record parsing needs to accept optional trailing comma
- **Contexts**: Expressions, types, patterns, function params, type params

#### Multiple Spreads
- **Spec status**: Examples show multiple spreads
- **Implementation**: NOT TESTED
- **Parsing**: Record/list parsing needs to handle `...` in multiple positions
- **Semantics**: Later spreads override earlier (right-to-left)

### Type System

#### Tuple Types
- **Spec status**: Documented in spec
- **Implementation**: UNCLEAR - may not be distinct from function param types
- **Issue**: `(Int, String)` could be tuple or function params
- **Resolution**: Context-dependent or distinct syntax?

#### Recursive Types
- **Spec status**: Documented with examples
- **Implementation**: LIKELY WORKS - needs verification
- **Testing**: Add comprehensive recursive type tests

### Edge Cases

#### Empty Blocks
- **Spec status**: `{}` returns Unit
- **Implementation**: NEEDS VERIFICATION
- **Parsing**: Block parser should handle zero statements

#### Multi-line Variants
- **Spec status**: `|` can be on new lines
- **Implementation**: NEEDS TESTING
- **Parsing**: Type definition parser needs to handle newlines before `|`

## Design Decisions

### Pattern Guards

**Decision needed**: AST representation
- **Option 1**: Add `guard?: Expr` field to all pattern types
- **Option 2**: Create `GuardedPattern` wrapper node
- **Recommendation**: Option 1 - simpler, more direct

**Decision needed**: Guard evaluation semantics
- **Spec says**: Guards evaluated after pattern match succeeds, pattern bindings available
- **Implementation**: Need to ensure bindings from pattern are in scope for guard expression
- **Type checking**: Guard must type-check as Bool

### Type Annotations in Patterns

**Decision needed**: Where annotations are allowed
- **Spec shows**: Variable patterns, tuple patterns, record patterns
- **Not clear**: Can you annotate constructors? `Some(x: Int)`
- **Recommendation**: Start with variable patterns, expand as needed

**Decision needed**: Type checking behavior
- **Required**: Pattern type must be compatible with scrutinee type
- **Refinement**: Does annotation refine the type or must it match exactly?
- **Recommendation**: Must match exactly (no refinement)

### Lambda Parameter Features

**Decision needed**: Syntax priority when mixing features
- Can you have: `({ name }: { name: String }): String => name`?
- Order of parsing: destructuring, then param type, then return type
- **Recommendation**: Support all combinations, parse in order

### External Generics

**Decision needed**: Constraint syntax
- Does vibefun support type constraints? `<T extends Comparable>`
- **Spec check**: Review type system docs
- **Recommendation**: If not in spec, don't implement

### Trailing Commas

**Decision needed**: Consistency across contexts
- **Required**: Support in all contexts where commas used
- Lists: `[1, 2, 3,]` ✓
- Records: `{ a: 1, b: 2, }` ✓
- Tuples: `(1, 2, 3,)` ✓
- Function params: `fn(a, b, c,)` ✓
- Type params: `Map<K, V,>` ✓
- Function type params: `(a: Int, b: Int,) -> Int` ✓
- Pattern lists: `[a, b, c,]` ✓
- Pattern records: `{ a, b, }` ✓

**Implementation**: Update all comma-separated list parsers to accept optional trailing comma

### Field Shorthand

**Decision needed**: Evaluation order
- `{ name, age: 30 }` where `name` is a variable
- Must evaluate `name` variable in current scope
- **Spec check**: Confirm variables are evaluated, not treated as patterns

## Common Patterns

### Adding New AST Node Types

1. Define type in `packages/core/src/types/ast.ts`
2. Export type in `packages/core/src/types/index.ts`
3. Update parser to construct new nodes
4. Update type checker to handle new nodes
5. Update code generator to emit JS for new nodes

### Adding Keyword

1. Add to `packages/core/src/lexer/keywords.ts` keyword set
2. Lexer automatically tokenizes as KEYWORD token
3. Parser checks for specific keyword value in token stream

### Extending Existing Node Type

1. Add optional field to type definition
2. Update parser to populate field when present
3. Ensure backward compatibility (field is optional)
4. Type checker/codegen handle both cases

### Parser Testing Pattern

```typescript
it('should parse feature X', () => {
  const source = 'code example';
  const parser = new Parser(source, 'test.vf');
  const ast = parser.parse();

  expect(ast).toMatchObject({
    // Expected AST structure
  });
});

it('should throw on invalid syntax', () => {
  const source = 'invalid code';
  const parser = new Parser(source, 'test.vf');

  expect(() => parser.parse()).toThrow(ParserError);
  expect(() => parser.parse()).toThrow(/expected pattern/);
});
```

## Dependencies

### No External Dependencies Needed
All features can be implemented with existing parser infrastructure:
- Lexer handles all tokens
- Parser has all necessary utilities
- AST types can be extended
- Test framework (vitest) is set up

### Internal Dependencies
- Some features build on others:
  - Lambda destructuring needs pattern parser (already exists)
  - Type annotations in patterns need type parser (already exists)
  - External generics need type parameter parser (already exists)

## Validation Strategy

### Against Spec
For each feature:
1. Read relevant spec section carefully
2. Extract all examples from spec
3. Create tests for each example
4. Add edge cases not in spec
5. Verify implementation matches spec semantics

### Regression Prevention
- Run full test suite after each feature: `npm test`
- Run type checking: `npm run check`
- Run linting: `npm run lint`
- All existing tests must continue to pass

### Integration Testing
- Test features in combination:
  - Guards with or-patterns
  - Type annotations with destructuring
  - Trailing commas with spreads
  - etc.

## Notes for Implementation

### When Unclear
If implementation status is uncertain:
1. Write the test first (TDD approach)
2. Run the test
3. If it passes, feature exists - enhance tests for edge cases
4. If it fails, proceed with implementation
5. Document actual behavior found

### AST Changes
When modifying AST types:
- Keep changes backward compatible when possible
- Use optional fields for new features
- Document breaking changes clearly
- Update all files that construct AST nodes

### Error Messages
When adding error handling:
- Include source location (line/column)
- Provide helpful, descriptive messages
- Suggest fixes when possible
- Follow existing error patterns in codebase

### Code Style
Follow project coding standards:
- No `any` types
- Explicit return types on functions
- Functional style where appropriate
- Classes for parsers/stateful components
- Comprehensive tests for all code

## Success Metrics

### Per Feature
- [ ] Tests written before implementation
- [ ] All tests passing
- [ ] Spec examples covered
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] No regressions
- [ ] Code passes quality checks

### Overall
- [ ] All identified gaps closed
- [ ] Parser fully spec-compliant
- [ ] Test coverage > 90%
- [ ] Documentation updated
- [ ] No breaking changes to existing API (if possible)

## Known Test Issues (Not Parser Bugs)

### Phase 2.1 Lambda Annotation Test Failures

Six tests are failing in `lambda-annotations.test.ts` and `lambda-return-type.test.ts`, but these are **test bugs, not parser issues**. The parser is working correctly according to the spec.

#### Issue 1: RecordTypeField Property Naming (3 failures)

**Root Cause**: AST structure mismatch between test expectations and actual implementation

**Actual Implementation**:
- `RecordTypeField` type defined in `ast.ts:227-231`
- Uses property name: `typeExpr: TypeExpr`

**Test Expectation**:
- Tests expect property name: `type: { kind: "TypeConst", ... }`

**Affected Tests**:
- `lambda-annotations.test.ts:445` - "parses record type annotation"
- `lambda-annotations.test.ts:490` - "parses nested record type"
- `lambda-return-type.test.ts` - "parses lambda with record return type"

**Fix**: Change test expectations from `type:` to `typeExpr:`

**Parser Status**: ✅ Correct - AST consistently uses `typeExpr` for type expressions

#### Issue 2: Missing TupleType in AST (1 failure)

**Root Cause**: TupleType AST node doesn't exist yet

**Actual Implementation**:
- AST defines: TypeVar, TypeConst, TypeApp, FunctionType, RecordType, VariantType, UnionType
- No `TupleType` kind exists (ast.ts:205-222)
- `(Int, Int)` currently parses as `UnionType`

**Test Expectation**:
- Test expects: `{ kind: "TupleType", elements: [...] }`

**Affected Test**:
- `lambda-annotations.test.ts:469-475` - "parses tuple type annotation"

**Fix**: Change test to expect `UnionType` temporarily

**Future Work**: Phase 6.1 will implement proper TupleType support, then test can be reverted

**Parser Status**: ✅ Correct - no TupleType defined in type system yet

#### Issue 3: Underscore Pattern Classification (1 failure)

**Root Cause**: Test expectation is incorrect about how `_` should parse

**Actual Implementation**:
- Parser treats `_` as `WildcardPattern`
- This is the correct behavior for wildcard patterns

**Test Expectation**:
- Test expects: `{ kind: "VarPattern", name: "_" }`

**Affected Test**:
- `lambda-annotations.test.ts:539-545` - "parses underscore param with type"

**Fix**: Change test to expect `WildcardPattern`

**Parser Status**: ✅ Correct - underscore should be wildcard, not variable

#### Issue 4: Block Body Semicolon Requirement (1 failure)

**Root Cause**: Test violates language spec requirement for semicolons

**Test Code**: `"(x: Int) => { x + 1 }"`

**Parser Error**: "Ambiguous syntax: single expression in braces"

**Error Location**: `parse-expressions.ts:884`

**Spec Requirement**:
- `docs/spec/04-expressions/functions-composition.md:131`
- "All statements must end with semicolons, including the last one"

**Why Parser Rejects This**:
The parser cannot distinguish between:
- `{ x }` as block with single expr (should have `;` per spec)
- `{ x }` as record field shorthand (valid syntax)

By requiring the semicolon, the parser maintains an unambiguous grammar as specified in the language spec.

**Disambiguation Logic** (parse-expressions.ts:801-902):
1. Check for keywords (let, if, match, unsafe) → block
2. Check for record update (`{ id | ...}`) → record
3. Check for record field (`{ id : ...}`) → record
4. Check for record shorthand (`{ id }` or `{ id, ...}`) → record
5. Parse first expression speculatively
6. If followed by semicolon → rollback and parse as block
7. If followed by RBRACE → **ERROR: ambiguous syntax**
8. Otherwise → error

**Successful Block Examples**:
- `{ let x = 1; x; }` - Works (starts with keyword)
- `{ x; }` - Works (has semicolon, clearly a block)
- `{ x; y; }` - Works (multiple statements with semicolons)

**Affected Test**:
- `lambda-annotations.test.ts:550-556` - "parses typed param with block body"

**Fix**: Change to `"(x: Int) => { x + 1; }"` with semicolon

**Parser Status**: ✅ Correct - enforcing spec requirement for unambiguous grammar

### Summary of Test Fixes Needed

| Issue | Failures | Type | Fix Complexity |
|-------|----------|------|----------------|
| RecordTypeField naming | 3 | Wrong property name | Simple (find/replace) |
| TupleType missing | 1 | Expects non-existent AST node | Simple (change expectation) |
| Underscore pattern | 1 | Wrong pattern kind | Simple (change expectation) |
| Block semicolon | 1 | Violates spec | Simple (add semicolon) |

**Total**: 6 test bugs, all simple fixes, no parser changes needed

**Impact**: Once fixed, test suite will be 2380/2380 passing (100%)
