# Remove ASI - Context and Key Information

**Created**: 2025-11-11
**Last Updated**: 2025-11-11

## Design Decisions Summary

### Semicolons REQUIRED:
- After top-level module declarations (`let`, `type`, `external`, `import`)
- After every statement in block expressions (including trailing)
- After every item in external blocks

### Semicolons NOT required:
- In record literals (commas/newlines still work)

### Special Cases:
- **Lambda newlines**: `(x, y)\n=> body` still allowed
- **EOF handling**: Last declaration before EOF doesn't need semicolon
- **Trailing semicolons**: REQUIRED in blocks - `{ x; y; }`
- **Disambiguation**: `{ x; }` = block, `{ x }` = record

## Key Files to Modify

### Parser Implementation
- `packages/core/src/parser/parser-helpers.ts` - Remove ASI functions
- `packages/core/src/parser/parser.ts` - Top-level declarations
- `packages/core/src/parser/parse-expressions.ts` - Block expressions
- `packages/core/src/parser/parse-declarations.ts` - External blocks
- `packages/core/src/parser/parser-base.ts` - State management

### Documentation
- `docs/spec/02-lexical-structure/basic-structure.md` - Main ASI docs (lines 35-141)
- All 54 markdown files in `docs/spec/` - Code examples
- `packages/core/src/parser/CLAUDE.md` - Parser documentation

### Tests (18 parser test files)
- Delete: `asi.test.ts`
- Create: `semicolon-required.test.ts`
- Update: All parser tests with semicolons
- Update: ~30 desugarer test files

### Examples
- `examples/external-blocks.vf`
- `examples/js-interop-overloading.vf`

### Project Documentation
- `CLAUDE.md`
- `.claude/CODING_STANDARDS.md`
- `README.md`

## Current ASI Implementation (To Remove)

**Location**: `packages/core/src/parser/parser-helpers.ts`
- `shouldInsertSemicolon()` - Main ASI logic
- `isExpressionContinuation()` - Operators preventing ASI
- `isLineContinuation()` - Tokens preventing ASI
- `isStatementStart()` - Keywords triggering ASI

**Current behavior**:
- Newlines trigger ASI between declarations
- Newlines OR semicolons work in blocks
- ASI disabled in records
- Special handling for lambda newlines (KEEP)

## Breaking Changes

All vibefun code without semicolons will break:

**Before**: `let x = 1\nlet y = 2`
**After**: `let x = 1;\nlet y = 2;`

**Records unchanged**: `{ x: 1, y: 2 }` still works

## Success Criteria

- ✅ Parser requires explicit semicolons
- ✅ All tests pass
- ✅ Records/lambdas preserve special behavior
- ✅ Error messages are helpful
- ✅ No ASI references remain
- ✅ Documentation updated
