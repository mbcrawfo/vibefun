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
        // value bindings.
        const transformed = applyRenamesToDecl(decl, renames);

        if (transformed.kind === "CoreLetDecl" && transformed.pattern.kind === "CoreVarPattern") {
            const sourceName = transformed.pattern.name;

            if (seen.has(sourceName)) {
                const renamedName = nextRenamedName(sourceName, counters);

                const renamedDecl: CoreDeclaration = {
                    ...transformed,
                    pattern: { ...transformed.pattern, name: renamedName },
                };

                renames.set(sourceName, {
                    kind: "CoreVar",
                    name: renamedName,
                    loc: transformed.pattern.loc,
                });

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

                const renamedName = nextRenamedName(sourceName, counters);
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
 * Generate a fresh `<name>$<N>` and bump the counter for the next collision.
 */
function nextRenamedName(sourceName: string, counters: Map<string, number>): string {
    const next = (counters.get(sourceName) ?? 0) + 1;
    counters.set(sourceName, next);
    return `${sourceName}$${next}`;
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
