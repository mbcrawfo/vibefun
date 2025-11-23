# Record Field Keywords - Task Checklist

**Last Updated**: 2025-11-22 (Phase 1 COMPLETE - parser implementation done, tests and docs pending)

## Phase 1: Parser Implementation ✅ COMPLETE

### Helper Function ✅
- [x] Create `expectFieldName()` helper function
  - [x] Accept both `IDENTIFIER` and `KEYWORD` tokens
  - [x] Return `{ name: string; loc: Location }`
  - [x] Provide clear error message if neither token type found
  - [x] Document function with JSDoc
  - **Location**: `packages/core/src/parser/parser-base.ts:140-154`

### Update Record Expression Parsing ✅
- [x] Update normal record field parsing (line 1602 in parse-expressions.ts) - LOCATION 1
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Preserve existing behavior for identifiers
  - [x] Extract keyword string from `KEYWORD` token

- [x] Update record update field parsing (line 1533 in parse-expressions.ts) - LOCATION 2
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Handle keyword fields in spread updates

- [x] Add shorthand validation
  - [x] Check if field token is `KEYWORD` in shorthand context (lines 1614-1622, 1545-1553)
  - [x] Throw clear error with helpful message
  - [x] Suggest explicit syntax in error message

### Update Field Access Parsing ✅
- [x] Update field access parsing (line 567 in parse-expressions.ts) - LOCATION 3
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Allow `obj.type`, `obj.match`, etc.
  - [x] Support chained access: `obj.outer.type`

### Update Record Pattern Parsing ✅
- [x] Update pattern field parsing (line 260 in parse-patterns.ts) - LOCATION 4
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Handle keyword fields in patterns
  - [x] Ensure shorthand patterns still work correctly

### Update Record Type Parsing ✅
- [x] Update type field parsing in parse-types.ts (line 161) - LOCATION 5
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Allow keyword fields in type definitions

- [x] Update type field parsing in parse-declarations.ts (line 419) - LOCATION 6
  - [x] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [x] Allow keyword fields in type definitions
  - **Note**: Plan originally mentioned 5 locations, but 6 were correctly identified during implementation

## Phase 2: Testing

### Unit Tests - Record Expressions
- [ ] Create `keyword-field-names.test.ts` or add to existing tests
  - [ ] Test single keyword field: `{ type: "value" }`
  - [ ] Test multiple keyword fields: `{ type: "A", match: true, import: "x" }`
  - [ ] Test mixed keywords and identifiers: `{ type: "A", name: "B" }`
  - [ ] Test all 20 keywords as field names
  - [ ] Test reserved keywords (async, await, etc.)
  - [ ] Test nested records: `{ outer: { type: "inner" } }`
  - [ ] Test empty record: `{}`
  - [ ] Test trailing commas: `{ type: "A", }`

### Unit Tests - Record Updates
- [ ] Test keyword field in update: `{ ...base, type: "new" }`
- [ ] Test spread with keyword fields: `{ ...{ type: "A" }, match: true }`
- [ ] Test multiple spreads with keywords

### Unit Tests - Field Access
- [ ] Test simple field access with keywords: `obj.type`, `obj.match`
- [ ] Test chained field access: `obj.outer.type`
- [ ] Test deeply chained access: `obj.a.b.c` with all keywords
- [ ] Test field access in expressions: `obj.type & " suffix"`
- [ ] Test field access with all 20 keywords individually
- [ ] Test field access on nested records

### Unit Tests - Patterns
- [ ] Test pattern matching on keyword fields: `{ type: "A" }`
- [ ] Test pattern extraction: `{ type, match }`
- [ ] Test partial patterns: `{ type: "A", _ }`
- [ ] Test nested patterns: `{ outer: { type: "inner" } }`

### Unit Tests - Type Definitions
- [ ] Test type with keyword fields: `type T = { type: String }`
- [ ] Test generic types: `type Box<A> = { type: String, value: A }`
- [ ] Test nested types: `type Outer = { inner: { type: String } }`

### Unit Tests - Error Cases
- [ ] Test shorthand with keyword: `{ type }` → error
- [ ] Test clear error message for shorthand
- [ ] Test error suggests explicit syntax
- [ ] Test invalid field name (not identifier or keyword)

### Integration Tests
- [ ] Create end-to-end test file
  - [ ] Parse record with keyword fields
  - [ ] Pattern match on keyword fields
  - [ ] Access keyword fields
  - [ ] Type check records with keyword fields
  - [ ] Generate code for records with keyword fields

### Integration Tests - Desugarer
- [ ] Test desugarer with keyword field names
  - [ ] Verify record construction desugars correctly
  - [ ] Verify record updates desugar correctly
  - [ ] Verify field access desugars correctly
  - [ ] Check that field names remain as strings in core AST

### Integration Tests - Type Checker
- [ ] Test type inference with keyword fields
  - [ ] Verify `{ type: "x" }` infers correct type
  - [ ] Verify field access type inference: `obj.type`
  - [ ] Test with generic types: `Box<T> = { type: String, value: T }`
  - [ ] Test pattern matching type checking with keyword fields

### Integration Tests - Let-Binding Destructuring
- [ ] Verify let-binding destructuring behavior (if supported)
  - [ ] Test explicit syntax: `let { type: t } = node`
  - [ ] Test shorthand errors: `let { type } = node` should error
  - [ ] Verify error message is consistent with match patterns

### Example Programs
- [ ] Create `examples/keyword-fields.vf`
  - [ ] AST node example (type, import, export)
  - [ ] Configuration example
  - [ ] Pattern matching example
  - [ ] JavaScript interop example

## Phase 3: Documentation

### Spec Updates
- [ ] Update `docs/spec/03-type-system/record-types.md`
  - [ ] Add "Keywords as Field Names" section
  - [ ] Add examples with explicit syntax
  - [ ] Document shorthand limitation
  - [ ] Explain JavaScript interop rationale
  - [ ] Add to Table of Contents if needed

- [ ] Update `docs/spec/04-expressions/data-literals.md`
  - [ ] Update record construction section
  - [ ] Add keyword field examples
  - [ ] Update field shorthand section
  - [ ] Document shorthand limitation with keywords
  - [ ] Add examples throughout

- [ ] Update `docs/spec/04-expressions/basic-expressions.md` (CRITICAL)
  - [ ] Locate field access section (lines 255-296)
  - [ ] Document that DOT operator accepts keywords as field names
  - [ ] Add examples: `node.type`, `config.import`, `obj.match`
  - [ ] Show chained access: `obj.outer.type.value`
  - [ ] Clarify that this works for all keywords

- [ ] Update `docs/spec/05-pattern-matching/data-patterns.md`
  - [ ] Update record pattern section
  - [ ] Add keyword field pattern examples
  - [ ] Document shorthand behavior
  - [ ] Add mixed examples (keywords + identifiers)

- [ ] Update `docs/spec/02-lexical-structure/tokens.md`
  - [ ] Add note about keywords in field positions
  - [ ] Clarify keyword vs identifier usage
  - [ ] Document that keywords work as field names but not variable names

- [ ] Update `docs/spec/02-lexical-structure/operators.md`
  - [ ] Find DOT operator description
  - [ ] Clarify that field access accepts keywords
  - [ ] Add brief example or note

- [ ] Update `docs/spec/.agent-map.md` (REQUIRED)
  - [ ] Add to Quick Lookup Table: "Can I use keywords as field names?"
  - [ ] Point to relevant spec files (record-types, data-literals, basic-expressions)
  - [ ] Update any related cross-references
  - [ ] Ensure synchronization with spec changes per maintenance rules

- [ ] Update `.claude/VIBEFUN_AI_CODING_GUIDE.md` (REQUIRED)
  - [ ] Add to syntax patterns section
  - [ ] Document keyword fields in "Records and Types" section
  - [ ] Add to JavaScript interop section (common use case)
  - [ ] Add to gotchas/common patterns: shorthand limitation
  - [ ] Include practical examples for AI agents

### Code Documentation
- [ ] Add JSDoc comments to `expectFieldName()`
- [ ] Update relevant comments in parser files
- [ ] Document shorthand validation logic

## Phase 4: Quality Assurance

### Verification
- [ ] Run type checking: `npm run check`
- [ ] Run linting: `npm run lint`
- [ ] Run all tests: `npm test`
- [ ] Run formatter: `npm run format`
- [ ] Run full verification: `npm run verify`

### Manual Testing
- [ ] Test with all 20 keywords individually in all 5 contexts
- [ ] Test with all 8 reserved keywords
- [ ] Test complex nested records with keywords
- [ ] Test chained field access with multiple keywords
- [ ] Verify error messages are clear and helpful
- [ ] Test edge cases (empty records, trailing commas, etc.)
- [ ] Verify module vs field access disambiguation
- [ ] Test generic types with keyword fields
- [ ] Test all keywords as field names in one record

### Code Review Checklist
- [ ] No `any` types introduced
- [ ] All functions have explicit return types
- [ ] Error messages are clear and actionable
- [ ] Tests cover all edge cases
- [ ] Code follows project coding standards
- [ ] Documentation is comprehensive

### Regression Testing
- [ ] All existing record tests still pass
- [ ] All existing pattern tests still pass
- [ ] All existing type tests still pass
- [ ] No breaking changes to existing behavior
- [ ] Parser performance not degraded

## Phase 5: Finalization

### Final Checks
- [ ] Review all changed files
- [ ] Ensure consistent code style
- [ ] Verify all TODOs removed
- [ ] Check for any debug code or console.logs
- [ ] Verify test coverage is comprehensive

### Commit and Documentation
- [ ] Create meaningful commit message
- [ ] Include examples in commit description
- [ ] Update this task list with completion status
- [ ] Mark all tasks as complete

### Branch Management
- [ ] Ensure all changes on `claude/record-field-keywords-01WhvghL2Mq1iHtR27i7ijMq`
- [ ] No changes on other branches
- [ ] Ready for push to remote

## Summary Checklist

Quick overview of major milestones:

- [x] **Parser Implementation Complete** (Phase 1) ✅ DONE
  - Helper function created at `parser-base.ts:140-154`
  - All 6 parser locations updated:
    - Location 1: Record construction (normal fields) - `parse-expressions.ts:1602`
    - Location 2: Record construction (update fields) - `parse-expressions.ts:1533`
    - Location 3: Field access (DOT operator) - `parse-expressions.ts:567`
    - Location 4: Record patterns - `parse-patterns.ts:260`
    - Location 5: Record type definitions - `parse-types.ts:161`
    - Location 6: Record type definitions - `parse-declarations.ts:419` (discovered during implementation)
  - Shorthand validation added with clear error messages
  - Quality checks pass: type checking, linting, formatting
  - All 2,641 existing tests pass (no regressions)
  - Committed: f9fa24f

- [ ] **Tests Complete** (Phase 2)
  - Unit tests for all 5 parser contexts
  - Field access tests (simple and chained)
  - Integration tests (end-to-end)
  - Integration with desugarer
  - Integration with type checker
  - Let-binding destructuring verified
  - Error case tests
  - Example programs

- [ ] **Documentation Complete** (Phase 3)
  - All 8 documentation files updated:
    - record-types.md
    - data-literals.md
    - basic-expressions.md (CRITICAL)
    - data-patterns.md
    - tokens.md
    - operators.md
    - .agent-map.md (REQUIRED)
    - VIBEFUN_AI_CODING_GUIDE.md (REQUIRED)
  - Examples added to all spec files
  - Code comments updated
  - AI coding guide updated

- [ ] **Quality Checks Pass** (Phase 4)
  - `npm run verify` passes
  - All existing tests still pass
  - Manual testing complete
  - No regressions
  - Module vs field access verified
  - All edge cases tested

- [ ] **Ready for Review**
  - All tasks complete
  - All 5 parser locations working
  - All 8 documentation files updated
  - Code committed
  - Task list updated with completion

## Notes

- Update "Last Updated" timestamp when making progress
- Mark tasks with ✅ when completed
- Add notes about any blockers or issues encountered
- Keep this file in sync with actual implementation progress
