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
                const next = (counters.get(sourceName) ?? 0) + 1;
                counters.set(sourceName, next);
                const renamedName = `${sourceName}$${next}`;

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

        // Mark any names introduced by this decl so subsequent same-name
        // bindings shadow them. We only need this for kinds the codegen
        // actually emits as JS bindings — let-rec groups, externals.
        if (transformed.kind === "CoreLetRecGroup") {
            for (const binding of transformed.bindings) {
                if (binding.pattern.kind === "CoreVarPattern") {
                    seen.add(binding.pattern.name);
                }
            }
        } else if (transformed.kind === "CoreExternalDecl") {
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
