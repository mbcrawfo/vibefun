/**
 * Top-level shadow renaming pass.
 *
 * Vibefun permits shadowing at the module level (per spec
 * docs/spec/04-expressions/functions-composition.md:152-163: "let x = 1;
 * let x = 2; — Shadows previous x (creates new binding)"). JavaScript
 * forbids redeclaring a `const` / `let` in the same scope, so we α-rename
 * later occurrences to a fresh name (`x$1`, `x$2`, …) and substitute
 * subsequent references accordingly.
 *
 * The pass uses the codebase's capture-avoiding `substituteMultiple`
 * helper so local rebindings (lambda parameters, nested `let`s,
 * pattern-bound match arms) shadow the rename map naturally — only
 * top-level free references are rewritten.
 *
 * Limitations: only `CoreVarPattern` shadowing is handled. Tuple/wildcard
 * patterns at the top level can't redeclare a name with the same identity
 * shape, so they're left alone. Re-exports of shadowed names use export
 * aliasing (`export { x$1 as x }`) so the public API stays stable.
 */

import type { CoreDeclaration, CoreExpr, CoreModule } from "../../types/core-ast.js";

import { substituteMultiple } from "../../utils/substitution.js";

/**
 * Rename later occurrences of duplicate top-level `let pattern = …` bindings
 * (where the pattern is a simple variable) and rewrite all subsequent
 * free references to the renamed binding.
 *
 * Returns a new `CoreModule`; the input is not mutated.
 */
export function renameTopLevelShadows(module: CoreModule): {
    module: CoreModule;
    /** Source name → renamed name (only includes shadowed bindings). */
    exportAliases: Map<string, string>;
} {
    const seen = new Set<string>();
    const counters = new Map<string, number>();
    const renames = new Map<string, CoreExpr>();
    const exportAliases = new Map<string, string>();
    const newDeclarations: CoreDeclaration[] = [];

    for (const decl of module.declarations) {
        // Substitute current renames into the declaration before processing
        // it. Imports/types/externals aren't rewritten — they don't reference
        // value bindings. For recursive bindings (`let rec` or
        // `CoreLetRecGroup`), the names being introduced *must* be excluded
        // from the active rename map: otherwise a self/mutual reference like
        // `let rec x = … x …` whose `x` was previously shadowed would be
        // pre-rewritten to point at the prior renamed binding (`x$1`)
        // instead of the new recursive binding (`x$2`).
        const transformed = applyRenamesToDecl(decl, renamesForDecl(decl, renames));

        if (transformed.kind === "CoreLetDecl" && transformed.pattern.kind === "CoreVarPattern") {
            const sourceName = transformed.pattern.name;

            if (seen.has(sourceName)) {
                const renamedName = nextRenamedName(sourceName, counters, seen);
                const renamedVarExpr: CoreExpr = {
                    kind: "CoreVar",
                    name: renamedName,
                    loc: transformed.pattern.loc,
                };

                // For a non-recursive `let`, the body is evaluated in the
                // outer scope, so its references to `sourceName` already
                // resolved against `renames` in the pre-pass above and
                // correctly point at the prior shadow. For a recursive
                // `let rec`, the body's `sourceName` references are
                // self-references — the masked pre-pass left them as
                // literal `sourceName`, so substitute the new alias in
                // here.
                const renamedDecl: CoreDeclaration = {
                    ...transformed,
                    pattern: { ...transformed.pattern, name: renamedName },
                    value: transformed.recursive
                        ? substituteMultiple(transformed.value, new Map([[sourceName, renamedVarExpr]]))
                        : transformed.value,
                };

                renames.set(sourceName, renamedVarExpr);

                if (renamedDecl.kind === "CoreLetDecl" && renamedDecl.exported) {
                    exportAliases.set(sourceName, renamedName);
                }

                newDeclarations.push(renamedDecl);
                continue;
            }

            seen.add(sourceName);
        }

        // Let-rec groups bind multiple names at once; each binding name
        // must also be checked against `seen` so a recursive group can't
        // accidentally redeclare a prior top-level binding's name. The
        // group as a whole is rewritten in place: we walk its bindings,
        // rename any that shadow, and update `renames` *as we go* so
        // mutually-recursive references inside the group also see the
        // rename. (Re-substituting the group's own bodies after the
        // rename keeps cross-binding references consistent.)
        if (transformed.kind === "CoreLetRecGroup") {
            const groupRenames = new Map<string, CoreExpr>();
            const newBindings = transformed.bindings.map((binding) => {
                if (binding.pattern.kind !== "CoreVarPattern") {
                    return binding;
                }
                const sourceName = binding.pattern.name;
                if (!seen.has(sourceName)) {
                    seen.add(sourceName);
                    return binding;
                }

                const renamedName = nextRenamedName(sourceName, counters, seen);
                groupRenames.set(sourceName, {
                    kind: "CoreVar",
                    name: renamedName,
                    loc: binding.pattern.loc,
                });
                renames.set(sourceName, {
                    kind: "CoreVar",
                    name: renamedName,
                    loc: binding.pattern.loc,
                });
                if (transformed.exported) {
                    exportAliases.set(sourceName, renamedName);
                }
                return { ...binding, pattern: { ...binding.pattern, name: renamedName } };
            });

            // Re-apply the group's intra-group renames so any recursive
            // references between bindings (mutual recursion) resolve to
            // the renamed binding rather than the original name.
            const finalBindings = newBindings.map((binding) => ({
                ...binding,
                value: substituteIfNeeded(binding.value, groupRenames),
            }));

            newDeclarations.push({ ...transformed, bindings: finalBindings });
            continue;
        }

        if (transformed.kind === "CoreExternalDecl") {
            seen.add(transformed.name);
        }

        newDeclarations.push(transformed);
    }

    return {
        module: { ...module, declarations: newDeclarations },
        exportAliases,
    };
}

/**
 * Compute the rename map to apply to a declaration before processing
 * it. Recursive declarations must mask the names they bind: their
 * bodies legitimately reference those names as self/mutual references,
 * and pre-rewriting them to a prior shadow would point the recursive
 * call at the wrong binding.
 */
function renamesForDecl(decl: CoreDeclaration, renames: Map<string, CoreExpr>): Map<string, CoreExpr> {
    if (renames.size === 0) return renames;
    if (decl.kind === "CoreLetRecGroup") {
        return withoutKeys(renames, boundVarNamesInRecGroup(decl));
    }
    if (decl.kind === "CoreLetDecl" && decl.recursive && decl.pattern.kind === "CoreVarPattern") {
        return withoutKeys(renames, new Set([decl.pattern.name]));
    }
    return renames;
}

/**
 * Return a copy of `renames` with every entry whose key is in
 * `blocked` removed. Returns `renames` unchanged when there is
 * nothing to filter so the common no-op case stays cheap.
 */
function withoutKeys(renames: Map<string, CoreExpr>, blocked: Set<string>): Map<string, CoreExpr> {
    if (renames.size === 0 || blocked.size === 0) return renames;
    const filtered = new Map<string, CoreExpr>();
    for (const [name, expr] of renames) {
        if (!blocked.has(name)) filtered.set(name, expr);
    }
    return filtered;
}

/** Names introduced by a `CoreLetRecGroup` (only simple var patterns). */
function boundVarNamesInRecGroup(decl: Extract<CoreDeclaration, { kind: "CoreLetRecGroup" }>): Set<string> {
    const names = new Set<string>();
    for (const binding of decl.bindings) {
        if (binding.pattern.kind === "CoreVarPattern") names.add(binding.pattern.name);
    }
    return names;
}

/**
 * Generate a fresh `<name>$<N>` that doesn't collide with any name
 * already in `seen`. The counter alone isn't enough — user code might
 * legitimately bind a name like `x$1` directly, and `let x = 1; let
 * x$1 = 2; let x = 3;` would otherwise rename the third `x` to `x$1`
 * and reintroduce the duplicate-binding `SyntaxError` this pass exists
 * to prevent. Both the counter and the `seen` set are updated so the
 * chosen alias is also off-limits for future shadow renames.
 */
function nextRenamedName(sourceName: string, counters: Map<string, number>, seen: Set<string>): string {
    let next = counters.get(sourceName) ?? 0;
    let candidate: string;
    do {
        next += 1;
        candidate = `${sourceName}$${next}`;
    } while (seen.has(candidate));
    counters.set(sourceName, next);
    seen.add(candidate);
    return candidate;
}

/**
 * Run substituteMultiple iff the rename map is non-empty. Avoids the
 * cost of a full traversal when nothing changed.
 */
function substituteIfNeeded(expr: CoreExpr, renames: Map<string, CoreExpr>): CoreExpr {
    return renames.size === 0 ? expr : substituteMultiple(expr, renames);
}

/**
 * Apply the active rename map to every value/body expression in a
 * declaration. Type, import, and re-export declarations don't carry
 * value expressions, so they're returned as-is.
 */
function applyRenamesToDecl(decl: CoreDeclaration, renames: Map<string, CoreExpr>): CoreDeclaration {
    if (renames.size === 0) {
        return decl;
    }

    switch (decl.kind) {
        case "CoreLetDecl":
            return { ...decl, value: substituteMultiple(decl.value, renames) };
        case "CoreLetRecGroup":
            return {
                ...decl,
                bindings: decl.bindings.map((binding) => ({
                    ...binding,
                    value: substituteMultiple(binding.value, renames),
                })),
            };
        case "CoreTypeDecl":
        case "CoreExternalDecl":
        case "CoreExternalTypeDecl":
        case "CoreImportDecl":
        case "CoreReExportDecl":
            return decl;
    }
}
