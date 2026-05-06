/**
 * Test-only helpers for unification soundness oracles.
 *
 * Production code must not import from this module. The helper here mirrors
 * the directional width-subtyping rule documented in `unify.ts` so property
 * tests can assert the actual post-condition of `unify` / `solveConstraints`
 * (one-sided record width subtyping at record positions, structural equality
 * everywhere else) instead of the strictly-stronger structural equality that
 * `typeEquals` checks.
 */

import type { Type } from "../types/environment.js";

/**
 * One-sided structural-equivalence oracle for `unify(narrower, wider)` and
 * `solveConstraints` outputs.
 *
 * Mirrors `unifyRecords` in `unify.ts`: with `narrower` in r1's role and
 * `wider` in r2's role, every field in `narrower` must exist in `wider` with
 * an equivalent type, and `wider` may carry extras. Compound non-record
 * types require structural equality (recursing through children with this
 * same predicate so nested records inherit the rule).
 *
 * Only valid as a soundness oracle for unify / constraint-solver outputs —
 * never as a substitute for `typeEquals` in non-unification settings.
 *
 * The helper does not enforce App-argument invariance directly. It does not
 * need to: when `unify` succeeds inside an App argument it runs in
 * `ctx.exact` mode, so the records there already have equal field sets and
 * the recursive check passes trivially. Pair this oracle with the actual
 * unifier — it is not a stand-alone subtype checker.
 */
export function unifyEquivalent(narrower: Type, wider: Type): boolean {
    if (narrower.type !== wider.type) {
        return false;
    }

    switch (narrower.type) {
        case "Var":
            return narrower.id === (wider as Type & { type: "Var" }).id;
        case "Const":
            return narrower.name === (wider as Type & { type: "Const" }).name;
        case "Fun": {
            const w = wider as Type & { type: "Fun" };
            if (narrower.params.length !== w.params.length) {
                return false;
            }
            for (let i = 0; i < narrower.params.length; i++) {
                const np = narrower.params[i];
                const wp = w.params[i];
                if (np === undefined || wp === undefined || !unifyEquivalent(np, wp)) {
                    return false;
                }
            }
            return unifyEquivalent(narrower.return, w.return);
        }
        case "App": {
            const w = wider as Type & { type: "App" };
            if (narrower.args.length !== w.args.length) {
                return false;
            }
            if (!unifyEquivalent(narrower.constructor, w.constructor)) {
                return false;
            }
            for (let i = 0; i < narrower.args.length; i++) {
                const na = narrower.args[i];
                const wa = w.args[i];
                if (na === undefined || wa === undefined || !unifyEquivalent(na, wa)) {
                    return false;
                }
            }
            return true;
        }
        case "Record": {
            const w = wider as Type & { type: "Record" };
            // Width subtyping: every field in `narrower` must exist in
            // `wider` with an equivalent type; `wider` may carry extras.
            for (const [name, narrowerFieldType] of narrower.fields) {
                const widerFieldType = w.fields.get(name);
                if (widerFieldType === undefined) {
                    return false;
                }
                if (!unifyEquivalent(narrowerFieldType, widerFieldType)) {
                    return false;
                }
            }
            return true;
        }
        case "Variant": {
            const w = wider as Type & { type: "Variant" };
            if (narrower.constructors.size !== w.constructors.size) {
                return false;
            }
            for (const [name, narrowerParams] of narrower.constructors) {
                const widerParams = w.constructors.get(name);
                if (widerParams === undefined || widerParams.length !== narrowerParams.length) {
                    return false;
                }
                for (let i = 0; i < narrowerParams.length; i++) {
                    const np = narrowerParams[i];
                    const wp = widerParams[i];
                    if (np === undefined || wp === undefined || !unifyEquivalent(np, wp)) {
                        return false;
                    }
                }
            }
            return true;
        }
        case "Union": {
            const w = wider as Type & { type: "Union" };
            if (narrower.types.length !== w.types.length) {
                return false;
            }
            for (let i = 0; i < narrower.types.length; i++) {
                const nt = narrower.types[i];
                const wt = w.types[i];
                if (nt === undefined || wt === undefined || !unifyEquivalent(nt, wt)) {
                    return false;
                }
            }
            return true;
        }
        case "Tuple": {
            const w = wider as Type & { type: "Tuple" };
            if (narrower.elements.length !== w.elements.length) {
                return false;
            }
            for (let i = 0; i < narrower.elements.length; i++) {
                const ne = narrower.elements[i];
                const we = w.elements[i];
                if (ne === undefined || we === undefined || !unifyEquivalent(ne, we)) {
                    return false;
                }
            }
            return true;
        }
        case "Ref": {
            const w = wider as Type & { type: "Ref" };
            return unifyEquivalent(narrower.inner, w.inner);
        }
        case "Module":
            return narrower.path === (wider as Type & { type: "Module" }).path;
        case "Never":
            return true;
        case "StringLit":
            return narrower.value === (wider as Type & { type: "StringLit" }).value;
    }
}
