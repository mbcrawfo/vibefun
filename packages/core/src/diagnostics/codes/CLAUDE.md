# Diagnostic Code Definitions

Per-phase registries of `VFxxxx` codes. The step-by-step guide for adding a code is in `./README.md`.

## Pitfalls That Bite Silently

- **Message/hint `{placeholder}` tokens must match the params** passed to `throwDiagnostic()` / `createDiagnostic()` at every call site. Typos in either direction leave literal `{braces}` in the rendered error — no runtime warning.
- **Subcategory ranges are not runtime-enforced.** Before picking a number, open the existing phase file and pick the next free slot inside the right subcategory (see the table in `./README.md`).
- **Each phase file ends with a `registerXxxCodes()` function that must be called from `./index.ts`.** New phase files must be wired there or their codes won't be registered, and `throwDiagnostic` will throw a "code not found" error.
- **Every code change must be followed by `pnpm docs:errors`**, which regenerates `docs/errors/`. CI fails if the generated docs are out of date.
- **Examples are a contract**, not a nicety — write realistic, runnable Vibefun code. Users read them to understand the error.

## Maintenance

If a new phase file is added (e.g. `codegen.ts`, `runtime.ts`), update `./index.ts` to call its register function and extend `./README.md`'s code-range table. Keep this file in sync if any of the five pitfalls above change.
