# Parser Snapshot Tests - Context

**Last Updated**: 2025-11-22

## Key Files

### Parser Implementation
- `packages/core/src/parser/parser.ts` - Main parser entry point
- `packages/core/src/parser/parse-expressions.ts` - Expression parsing (16 precedence levels)
- `packages/core/src/parser/parse-patterns.ts` - Pattern matching
- `packages/core/src/parser/parse-types.ts` - Type expressions
- `packages/core/src/parser/parse-declarations.ts` - Top-level declarations

### Supporting Files
- `packages/core/src/lexer/lexer.ts` - Tokenization (used by snapshot tests)
- `packages/core/src/types/ast.ts` - AST type definitions

### Test Files to Create
- `packages/core/src/parser/snapshot-tests/snapshot-tests.test.ts` - Test runner
- `packages/core/src/parser/snapshot-tests/fixtures/*.vf` - Test fixtures (8 files)
- `packages/core/src/parser/snapshot-tests/CLAUDE.md` - Documentation

### Language Specification
- `docs/spec/.agent-map.md` - Navigation guide to spec sections
- `docs/spec/syntax/` - Syntax specification
- `docs/spec/types/` - Type system specification

## Current Parser Test Coverage

### Existing Tests (35 files, 17,697 lines)
The parser already has comprehensive **unit tests** covering:
- Operator precedence (all 16 levels)
- Error handling and recovery
- Unicode edge cases
- Deep nesting scenarios
- Semicolon requirements
- Trailing commas
- Large literals and boundary conditions

### What Snapshot Tests Add
Snapshot tests **complement** unit tests by:
1. **Realistic code samples**: Multi-feature programs vs isolated feature tests
2. **AST documentation**: Human-readable canonical examples
3. **Regression detection**: Catch unintended structural changes
4. **Spec validation**: End-to-end verification of language specification
5. **Holistic coverage**: Feature interactions vs individual features

## Design Decisions

### Why .vf Fixture Files?
- **Realistic**: Test actual vibefun code, not inline strings
- **Maintainable**: Easy to read and modify test cases
- **Reusable**: Can use fixtures for other tests (type checker, codegen)
- **Documentation**: Serves as example code for developers

### Why 20-50 Line Samples?
- **Comprehensive**: Exercise multiple features together
- **Manageable**: Not too large for review and debugging
- **Realistic**: Similar to real code modules
- **Focused**: Each sample has clear purpose

### Why 8 Categories?
- **Organized**: Clear separation of parser features
- **Comprehensive**: Covers all major language constructs
- **Balanced**: ~10-15 samples per category = 80-120 total snapshots
- **Maintainable**: Not overwhelming, easy to navigate

### Snapshot Format
- **JSON**: Standard vitest snapshot format
- **Formatted**: Human-readable with indentation
- **Versioned**: Committed to git for change tracking
- **Diffable**: Easy to review changes in PRs

## Parser Features Covered

### Declarations
- Let bindings (simple, mutable, recursive, mutual recursion)
- Type declarations (aliases, records, variants, generics)
- External declarations (single, blocks, with types)
- Import/export declarations

### Expressions (16 Precedence Levels)
- Literals (int, float, string, bool, unit)
- Data structures (lists, records, tuples)
- Operators (arithmetic, logical, comparison, composition, pipe)
- Control flow (if-then-else, match, while, blocks)
- Functions (lambdas, currying, application)
- Special (unsafe blocks, type annotations)

### Patterns
- Basic (wildcard, variable, literal, constructor)
- Structured (tuple, list, record)
- Advanced (or-patterns, guards, destructuring, nesting)

### Types
- Basic (constants, variables, opaque)
- Composite (functions, records, tuples)
- Generic (type application, parameters)
- Advanced (unions, recursive types)

## Implementation Strategy

### Phase 1: Setup
1. Create directory structure
2. Set up test runner with vitest
3. Create helper function for parsing .vf files

### Phase 2: Create Fixtures
1. Write 8 .vf fixture files with realistic code samples
2. Each file focuses on one category but includes cross-feature interactions
3. Include comments explaining what's being tested

### Phase 3: Generate Snapshots
1. Run tests to generate initial snapshots
2. Review AST output for correctness
3. Commit snapshots to git

### Phase 4: Documentation
1. Create CLAUDE.md with maintenance guidelines
2. Emphasize critical review before snapshot updates
3. Document update procedures and review process

## Quality Assurance

### Before Committing
- [ ] All tests pass with `npm test`
- [ ] Snapshots are formatted and readable
- [ ] .vf fixtures are valid vibefun code
- [ ] CLAUDE.md clearly explains update procedures
- [ ] Each snapshot has clear purpose and test name

### Review Checklist
- [ ] Realistic code samples (not contrived)
- [ ] Representative coverage of parser features
- [ ] Edge cases included where appropriate
- [ ] AST structure matches language specification
- [ ] Snapshots are diffable and reviewable

## Future Considerations

### When to Update Snapshots
- **Expected**: Parser refactoring that doesn't change AST structure
- **Expected**: Adding new AST node fields for new features
- **Review carefully**: Changes to existing AST node structure
- **Reject**: Unexpected structural changes (likely bugs)

### Extending Coverage
- Add new fixture files for new language features
- Keep samples focused and realistic
- Avoid exhaustive coverage (use unit tests for edge cases)
- Maintain balance between comprehensiveness and maintainability

### Integration with Other Tests
- Type checker can use same fixtures when implemented
- Code generator can validate output with same inputs
- Consider end-to-end tests using these fixtures
