# Lexer Requirements Sync - Context

**Last Updated**: 2025-01-07

## Key Files

### Requirements & Specification
- `.claude/LEXER_REQUIREMENTS.md` - Complete lexer specification (1104 lines)
- `docs/spec/02-lexical-structure/tokens.md` - Language spec for tokens

### Implementation Files
- `packages/core/src/types/token.ts` - Token type definitions
- `packages/core/src/lexer/lexer.ts` - Main lexer implementation (957 lines)
- `packages/core/src/parser/parser.ts` - Parser (uses token types extensively)

### Test Files
- `packages/core/src/lexer/identifiers.test.ts` - Keyword and identifier tests
- `packages/core/src/lexer/numbers.test.ts` - Number literal tests
- `packages/core/src/lexer/strings.test.ts` - String literal tests
- `packages/core/src/lexer/operators.test.ts` - Operator tests
- `packages/core/src/lexer/comments.test.ts` - Comment tests
- `packages/core/src/lexer/lexer.test.ts` - General lexer tests
- `packages/core/src/lexer/lexer-integration.test.ts` - Integration tests

## Gap Analysis Summary

### Critical Gaps (Must Fix)
1. **Missing 2 keywords**: `try`, `catch` not defined
2. **No reserved keyword handling**: 8 reserved keywords not implemented

### Implementation Discrepancies
1. **No Unicode NFC normalization**: Required for identifiers (critical) and strings (user decision)
2. **Token naming mismatch**: Current names don't match spec (EQ_EQ vs EQ)
3. **Keyword test count wrong**: Tests 16 keywords, should test 19

### Test Coverage Gaps
- Missing float edge case tests
- Missing explicit test for leading zeros as decimal
- Missing Unicode normalization tests
- Missing reserved keyword tests

## Design Decisions Made

### Reserved Keywords (User Decision)
**Decision**: Throw hard error when reserved keyword is used as identifier
**Rationale**: Prevents users from building dependencies on reserved words, avoiding future breaking changes

### String Normalization (User Decision)
**Decision**: Apply NFC normalization to string literal values during lexing
**Rationale**: Follows spec recommendation, ensures consistent string comparison
**Note**: Spec itself notes this "requires clarification" - may need revisiting

### Token Naming (User Decision)
**Decision**: Rename tokens to match spec naming conventions
**Rationale**: Standardization across codebase and documentation
**Impact**: High - touches many files including parser

### Unit Literal (User Decision)
**Decision**: Keep as separate LPAREN + RPAREN tokens
**Rationale**: Current approach works fine for parser, no benefit to changing

## Important Notes

### Token Rename Corrections
Original plan had incorrect mapping for `EQ`. Corrected mapping:
- Single `=` (assignment): `EQ` → `EQUALS`
- Double `==` (comparison): `EQ_EQ` → `EQ`

This is critical for parser correctness.

### String Normalization Uncertainty
The LEXER_REQUIREMENTS.md (line 895) and spec have conflicting guidance:
- Requirements: "Normalization behavior requires spec clarification"
- Spec (tokens.md:109-110): "String literal values are normalized to NFC during lexical analysis"

We're implementing normalization per spec and user decision, but documenting this as potentially needing future revision.

### Phase Ordering Rationale
Phases reordered from original plan:
1. Keywords first (easiest, foundational)
2. Reserved keywords (new feature, isolatable)
3. Test coverage (establishes baseline before changes)
4. Normalization (well-defined, moderate impact)
5. Documentation (before big disruptive changes)
6. Token renames LAST (most disruptive, touches most files)

This ordering minimizes risk and makes debugging easier.

## Parser Impact Analysis

The parser uses token types in two ways:
1. Type checking: `if (token.type === "EQ_EQ")`
2. Pattern matching: `this.match("EQ_EQ")`

Both patterns need to be updated for token renames. The codebase uses string literals extensively, so TypeScript won't catch all errors - manual grep auditing is required.

## Performance Considerations

Unicode normalization with `.normalize('NFC')` adds performance overhead:
- Called on every identifier (in `readIdentifier()`)
- Called on every string literal (in `readSingleLineString()` and `readMultiLineString()`)

For large files (>10K LOC), this could be noticeable.

**Benchmark Plan** (after Phase 4):
```bash
# Create test file with many identifiers and strings
# Measure compilation time before/after normalization
time node packages/cli/dist/index.js compile large-test.vf
```

**Optimization Options** (if performance issue detected):
1. Only normalize non-ASCII identifiers/strings:
   ```typescript
   if (/[^\x00-\x7F]/.test(value)) {
       value = value.normalize('NFC');
   }
   ```
2. Cache normalized values (more complex, likely unnecessary)
3. Profile to identify actual bottlenecks

**Current Approach**: Implement as specified (correctness first), measure performance, optimize only if necessary. Most real-world code is primarily ASCII, so impact likely minimal.
