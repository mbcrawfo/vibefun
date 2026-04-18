# Module Loader

File I/O, parsing, and caching for `.vf` modules reachable from an entry point. **Pure from graph analysis** — cycle detection, compilation order, and import-level warnings live in the sibling `module-resolver/` module; do not move that logic here.

## Accumulates Errors (Non-Fail-Fast)

The loader buffers load-time errors in `this.errors` and returns them alongside the loaded modules instead of throwing on the first failure. This is deliberate so users see every broken import in one pass. When you add a new failure mode, keep the pattern — push to the errors array, continue if you can.

## Modules Are Keyed By Real Path

Modules are cached by the canonical/real path (after symlink resolution via `getRealPath`), not by the import specifier that led to them. Diamond dependencies therefore dedupe automatically, and case-only differences are caught via the optional case-sensitivity check. Don't change the cache key without understanding the diamond case.

## `__fixtures__/` Convention

Each subdirectory under `__fixtures__/` is a **self-contained test scenario** whose name is referenced by the loader tests:

- `single-module/` — no imports
- `simple-import/` — one → another
- `diamond-dependency/` — shared dependency via two paths
- `re-export/` — barrel file re-exports
- `circular/`, `value-cycle/`, `type-only-cycle/` — cycle variants

Adding a fixture directory means adding (or extending) a test that references it. Renaming or removing one will silently orphan tests unless updated together. See `__fixtures__/README.md` for the intent of each scenario.

## Backwards-Compat Re-Exports

The loader re-exports a few `config/` helpers (e.g. `findProjectRoot`, `loadVibefunConfig`) for callers that imported them before the `config/` module existed. Don't delete those re-exports without a migration note — downstream packages may still rely on the old paths.

## Maintenance

Keep the fixture list above in sync with `__fixtures__/`. If the cache keying, error-collection, or config re-export policies change, update this file in the same commit.
