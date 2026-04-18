# Optimizer Module

Fixed-point AST rewriter over Core AST. Full pass descriptions and API live in `./README.md`; this file only captures the pitfalls.

## Critical: Preserve `CoreUnsafe` Boundaries

Every pass **must refuse to optimize inside `CoreUnsafe` blocks**. Check it in both `canApply` and `transform` (use `containsUnsafe` from `utils/ast-analysis.ts`). Optimizing through unsafe code is a correctness bug, not a style issue — the whole point of the unsafe block is that semantics are opaque to the compiler.

## Fixed-Point Convergence Uses `exprEquals`

`optimizer.ts` loops `applySinglePass` until `exprEquals(current, previous)` (structural/deep equality, from `utils/expr-equality.ts`) or `maxIterations`. If a pass mutates nodes in place — or produces trees that are structurally identical to the input while being semantically different — convergence detection breaks and the loop spins to the iteration cap. All pass transforms must return fresh nodes.

## Levels Control Pipeline Length, Not Individual Passes

`O0` skips optimization, `O1` runs every registered pass once, `O2` iterates to fixed point. Passes themselves don't know the level. If a pass needs size heuristics, it reads them from its own options, not from the optimizer.

## Pass Ordering

Passes are applied in the order they're `addPass`'d. Ordering is not required for correctness (passes commute semantically) but affects how many iterations are needed to converge. Keep existing orderings unless you have a convergence test to back the change.

## Shared Helpers

`astSize`, `containsUnsafe`, `substitute`, `exprEquals`, and `freeVars` all live in `utils/` — passes import them, not reimplement them. If you add a new AST-analysis primitive, put it in `utils/` alongside the others.

## Maintenance

If passes are added, renamed, or removed, update `./README.md`'s pass list and this file's `CoreUnsafe`/helper references if the helper names change.
