# Parser Snapshot Tests

This directory contains snapshot tests for the vibefun parser. These tests complement the existing unit tests by validating end-to-end parser behavior with realistic vibefun code samples.

## Structure

```
snapshot-tests/
├── fixtures/                 # .vf source files
│   ├── declarations.vf       # Declaration forms
│   ├── expressions.vf        # Expression forms
│   ├── patterns.vf           # Pattern matching
│   ├── functions.vf          # Function definitions
│   ├── data-structures.vf    # Lists, records, tuples
│   ├── control-flow.vf       # If, match, while, blocks
│   ├── modules.vf            # Imports, exports, externals
│   └── real-world.vf         # Idiomatic functional patterns
├── __snapshots__/            # Generated snapshots (git-tracked)
└── snapshot-tests.test.ts    # Test runner
```

## What Snapshots Test

Snapshot tests capture the complete AST output for realistic vibefun code samples. They help:

1. **Detect regressions**: Changes to parser output trigger test failures
2. **Document parser behavior**: Snapshots serve as canonical AST examples
3. **Validate spec compliance**: Ensure parser matches language specification
4. **Test feature interactions**: Cover combinations of features working together

## Running Tests

```bash
# Run snapshot tests
npm test -- snapshot-tests

# Update snapshots after intentional parser changes
npm test -- snapshot-tests -u
```

## ⚠️ CRITICAL: Updating Snapshots

**NEVER blindly update snapshots!** Always review changes carefully:

### When to UPDATE snapshots (`-u`)

✅ **Safe to update:**
- Adding new AST fields for new language features
- Refactoring parser internals without changing AST structure
- Improving AST representation (with explicit approval)
- Adding new test fixtures (new snapshots)

### When to REJECT snapshot updates

❌ **Do NOT update if you see:**
- Unexpected structural changes to existing AST nodes
- Missing fields that were previously present
- Type changes in AST node properties
- Different node kinds for the same syntax

### Review Process

1. **Run tests** to see what changed
2. **Examine the diff** carefully - use `git diff` to see snapshot changes
3. **Understand WHY** the AST changed
4. **Verify intentionality** - is this change expected?
5. **Update if safe** - only if the change is intentional and correct

Example review workflow:

```bash
# 1. See what failed
npm test -- snapshot-tests

# 2. Review the changes
npm test -- snapshot-tests -u
git diff packages/core/src/parser/snapshot-tests/__snapshots__/

# 3. If changes look good, commit
# 4. If changes look wrong, investigate the parser bug
git checkout packages/core/src/parser/snapshot-tests/__snapshots__/
```

## Adding New Tests

To add new snapshot tests:

1. **Create a new .vf file** in `fixtures/` (or add to existing)
2. **Write realistic vibefun code** that exercises the feature
3. **Add a test case** in `snapshot-tests.test.ts`:
   ```typescript
   it("should parse new-feature.vf", () => {
       const ast = parseSnapshot("new-feature.vf");
       expect(ast).toMatchSnapshot();
   });
   ```
4. **Run tests with `-u`** to generate the initial snapshot
5. **Review the snapshot** to ensure correctness
6. **Commit both** the fixture and the snapshot

## Fixture Guidelines

When writing `.vf` fixture files:

- **Use realistic code**: Code developers would actually write
- **Focus on one category**: But include natural feature interactions
- **Keep files focused**: 20-50 lines per fixture
- **Add comments**: Explain what's being tested
- **Use supported syntax**: Only features actually implemented in the parser

## Troubleshooting

### Test fails with "Unexpected token" or "Parse error"

- The fixture uses syntax not yet implemented
- Check existing unit tests for supported syntax examples
- Simplify the fixture to use only implemented features

### Snapshot diff is huge

- Parser AST structure changed significantly
- Review carefully - this might indicate a bug
- Consider if the change is intentional and beneficial

### Import/Export errors

- Ensure imports use correct syntax: `import { X } from "module"`
- Ensure external declarations use proper syntax
- Check existing declaration tests for examples

## Future Expansion

These snapshot tests provide a foundation that can be expanded:

- Add more edge cases as they're discovered
- Create fixtures for new language features
- Use same fixtures for type checker and codegen tests
- Generate test coverage reports from snapshots

## Notes

- Snapshots are committed to git for version control
- Vitest automatically formats snapshots as readable JSON
- Each fixture is independent - no shared state between tests
- Test execution order doesn't matter
