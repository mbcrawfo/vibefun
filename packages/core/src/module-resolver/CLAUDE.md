# Module Resolver

Pure graph analysis over the `Map<realPath, Module>` produced by `module-loader/`. Produces compilation order, cycle diagnostics, and import-conflict errors — no file I/O.

## Cycles via Tarjan's SCC

`cycle-detector.ts` runs Tarjan's strongly-connected-components algorithm so that **all** cycles are found in one O(V+E) pass (not just the first). Any replacement must preserve that property; a simple DFS that bails on the first back-edge will miss overlapping cycles.

## Type-Only vs Value Cycles

Edges in the graph record whether the import is type-only or value-level. A cycle is treated as type-only only if **every** edge in it is type-only. The three outcomes:

- **Self-import (`A` imports `A`) — error `VF5004`.** Surfaces via the warning generator before any cycle analysis.
- **Value cycle — warning `VF5900`.** Allowed at build time but flagged because it can cause runtime initialization surprises.
- **Type-only cycle — silent.** Recorded on the result for tooling, no diagnostic.

When adjusting severity or adding new cycle categories, update `warning-generator.ts` and the snapshot fixtures together — the snapshots lock the user-facing message.

## Deterministic Output

Cycles and warnings are sorted alphabetically (canonical starting module, canonical path through the cycle) so that tests and snapshot output stay stable across platforms. Preserve the sort in any new output.

## Graph Builder Runs Before Cycle Detection

`module-graph-builder.ts` raises duplicate/shadowing import errors **while** it builds the graph, so those errors land before cycle detection runs. If you add a new graph-time check, keep it in the builder — not in a later pass — so error precedence stays consistent.

## Maintenance

Keep the diagnostic codes (`VF5004`, `VF5900`) and Tarjan reference in sync with `cycle-detector.ts` and `warning-generator.ts`. If files are split or renamed, update the references above.
