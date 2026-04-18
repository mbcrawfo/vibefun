# Snapshot Tests for ES2020 Codegen

Captures the generated JavaScript for representative Vibefun programs so unintended changes to output trigger test failures.

Each `snapshot-*.test.ts` pairs with a `.vf` fixture and uses the shared `compileFixture()` helper in `test-helpers.ts`, which runs the full pipeline (lexer → parser → desugarer → typechecker → codegen) and returns the generated JS.

## Fixtures

| File | Coverage |
|------|----------|
| `expressions.vf` | Literals, operators, lambdas, application |
| `declarations.vf` | Let bindings, type declarations, exports |
| `patterns.vf` | Pattern matching, destructuring |
| `data-structures.vf` | Records, tuples, variants |
| `functions.vf` | Curried functions, recursion |
| `real-world.vf` | Realistic usage patterns |

## Running / Updating

```bash
pnpm --filter @vibefun/core test -- snapshot             # run all
pnpm --filter @vibefun/core test -- snapshot-expressions # one category
pnpm --filter @vibefun/core test -- snapshot -u          # update after an intentional change
```

**Always review snapshot diffs before accepting updates.** A surprising diff is almost always a codegen regression, not a stale snapshot.

## Adding a Snapshot

1. Create a `<name>.vf` fixture.
2. Create `snapshot-<name>.test.ts` using `compileFixture("<name>.vf")` and `expect(code).toMatchSnapshot()`.
3. Run once to generate the snapshot, then review it before committing.

## Maintenance

Keep the fixture table in sync with the files on disk. If `test-helpers.ts` or the snapshot directory layout changes, update the description above.
