# AST Utilities

Visitor, equality, analysis, and substitution primitives for the Core AST. Shared by the typechecker, optimizer, and codegen.

## `ast-transform.ts` — Visitor Order Matters

`transformExpr(expr, fn)` walks **bottom-up**: children are transformed first, then `fn` is applied to the parent. If your transform depends on state that changes while walking (e.g., "have I seen an unsafe block above me?"), the bottom-up order means you can't rely on parent context during the recursive call. Use `visitExpr` for read-only side effects and `foldExpr` for accumulating values.

## `expr-equality.ts` — α vs Semantic

- `exprEquals` — **α-equivalent**, ignores bound-variable names. This is what the optimizer's fixed-point loop calls, so anything it returns true for is "unchanged" as far as convergence is concerned.
- `exprEquivalent` — stricter, accounts for more semantic details.

Know which you need; they produce different convergence behavior.

## `substitution.ts` — Freshen Before You Substitute

`substitute(expr, name, replacement)` and `substituteMultiple` do **not** rename bound variables. If `replacement` mentions a name that is bound inside `expr`, the substitution will capture it and change the meaning. Always call `freshen(baseName, avoidSet)` to pick a conflict-free name and rename before substituting — or ensure by construction that replacement has no free vars in common with the target's binders.

## `ast-analysis.ts` — Not All Names Are Free Names

- `freeVars(expr)` — variables referenced but not bound.
- `patternBoundVars(pattern)` — variables a pattern introduces.
- `containsUnsafe`, `containsRef`, `isRefOperation`, `isMutuallyRecursive`, `isRecursive`, `shouldInline`, `countVarUses`, `astSize`, `complexity` — optimizer heuristics and invariants.

Pattern-bound vars are **not** the same as free vars. A `match` arm's pattern adds names to the local scope; those names are *free* in the arm body only until `patternBoundVars` accounts for them. Optimization passes that rewrite match arms must use both.

## Maintenance

When a function is added, renamed, or removed here, update the section above it so the three category headers still describe real exports.
