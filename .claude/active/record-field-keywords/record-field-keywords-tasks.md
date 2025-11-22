# Record Field Keywords - Task Checklist

**Last Updated**: 2025-11-22

## Phase 1: Parser Implementation

### Helper Function
- [ ] Create `expectFieldName()` helper function
  - [ ] Accept both `IDENTIFIER` and `KEYWORD` tokens
  - [ ] Return `{ name: string; loc: Location }`
  - [ ] Provide clear error message if neither token type found
  - [ ] Document function with JSDoc

### Update Record Expression Parsing
- [ ] Update normal record field parsing (~line 1590 in parse-expressions.ts)
  - [ ] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [ ] Preserve existing behavior for identifiers
  - [ ] Extract keyword string from `KEYWORD` token

- [ ] Update record update field parsing (~line 1530 in parse-expressions.ts)
  - [ ] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [ ] Handle keyword fields in spread updates

- [ ] Add shorthand validation
  - [ ] Check if field token is `KEYWORD` in shorthand context
  - [ ] Throw clear error with helpful message
  - [ ] Suggest explicit syntax in error message

### Update Field Access Parsing
- [ ] Update field access parsing (~line 567 in parse-expressions.ts)
  - [ ] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [ ] Allow `obj.type`, `obj.match`, etc.

### Update Record Pattern Parsing
- [ ] Update pattern field parsing (~line 260 in parse-patterns.ts)
  - [ ] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [ ] Handle keyword fields in patterns
  - [ ] Ensure shorthand patterns still work correctly

### Update Record Type Parsing
- [ ] Update type field parsing (~line 161 in parse-types.ts)
  - [ ] Replace `expect("IDENTIFIER")` with `expectFieldName()`
  - [ ] Allow keyword fields in type definitions

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
- [ ] Test field access with keywords: `obj.type`
- [ ] Test chained access: `obj.outer.type`
- [ ] Test field access in expressions: `obj.type & " suffix"`

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

- [ ] Update `docs/spec/05-pattern-matching/data-patterns.md`
  - [ ] Update record pattern section
  - [ ] Add keyword field pattern examples
  - [ ] Document shorthand behavior
  - [ ] Add mixed examples (keywords + identifiers)

- [ ] Optional: Update `docs/spec/02-lexical-structure/tokens.md`
  - [ ] Add note about keywords in field positions
  - [ ] Clarify keyword vs identifier usage

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
- [ ] Test with all 20 keywords individually
- [ ] Test with all 8 reserved keywords
- [ ] Test complex nested records
- [ ] Verify error messages are clear and helpful
- [ ] Test edge cases (empty records, trailing commas, etc.)

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

- [ ] **Parser Implementation Complete**
  - Helper function created
  - All 5 parser locations updated
  - Shorthand validation added

- [ ] **Tests Complete**
  - Unit tests for all contexts
  - Integration tests
  - Error case tests
  - Example programs

- [ ] **Documentation Complete**
  - All spec files updated
  - Examples added
  - Code comments updated

- [ ] **Quality Checks Pass**
  - `npm run verify` passes
  - Manual testing complete
  - No regressions

- [ ] **Ready for Review**
  - All tasks complete
  - Code committed
  - Documentation updated

## Notes

- Update "Last Updated" timestamp when making progress
- Mark tasks with ✅ when completed
- Add notes about any blockers or issues encountered
- Keep this file in sync with actual implementation progress
