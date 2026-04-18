# Parser Snapshot Tests

End-to-end parser validation against realistic Vibefun code. Each category has its own `.vf` fixture, `snapshot-<name>.test.ts`, and `__snapshots__/` directory.

## Running

```bash
npm test -- snapshot-tests              # all snapshot tests
npm test -- snapshot-declarations       # one category
npm test -- snapshot-tests -u           # update all after intentional changes
```

## CRITICAL: Never Blindly Update Snapshots

Snapshots are the source of truth for parser behavior. If a diff surprises you, assume the parser is wrong, not the snapshot.

**Safe to update with `-u`:**
- Adding a fixture or a new AST field for a new language feature.
- Internal parser refactors that don't change AST structure.

**Do NOT update if you see:**
- Unexpected structural changes to existing nodes.
- Missing fields that used to be present.
- Node-kind changes for the same syntax.
- Type changes on AST properties.

Review workflow:

```bash
npm test -- snapshot-tests              # see failures
git diff packages/core/src/parser/snapshot-tests/__snapshots__/
# If intentional → keep the update and commit. If not → revert and fix the parser.
```

## Fixtures

Keep `.vf` fixtures focused (20–50 lines), realistic, and using only syntax the parser currently accepts. Add comments to explain what the fixture is exercising. Each fixture is independent — no shared state between tests.

## Adding a Category

1. Create `<name>.vf` with the new code.
2. Create `snapshot-<name>.test.ts` that parses the fixture and asserts `toMatchSnapshot()`. Pattern the test after the existing ones — same imports, same `parseFixture` helper shape.
3. Run with `-u` to generate the initial snapshot.
4. Review the snapshot before committing.

## Maintenance

Keep this file in sync with the set of categories that actually exist on disk; if fixture naming conventions change, update the "Adding a Category" steps above.
