/**
 * Sanity tests for the `type-arb` arbitraries.
 *
 * These confirm the generators produce values matching the intended shape
 * invariants (Type discriminants stay within the supported set; type-variable
 * IDs stay within the configured range; substitutions are valid maps;
 * type-scheme bound vars are a subset of the body's free vars). The goal is
 * to catch regressions in the generators themselves before they silently
 * weaken the property tests that depend on them.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
    alphaEquivalent,
    constraintArb,
    freeVarsOfType,
    groundTypeArb,
    MAX_VAR_ID,
    PRIMITIVE_TYPE_NAMES,
    typeArb,
    typeEnvArb,
    typeSchemeArb,
    typeSubstitutionArb,
} from "./index.js";

const SUPPORTED_TYPE_KINDS = new Set(["Var", "Const", "Fun", "App", "Tuple", "Record"]);

describe("typeArb", () => {
    it("property: every generated type has a supported discriminant", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                walkTypes(t, (sub) => {
                    expect(SUPPORTED_TYPE_KINDS.has(sub.type)).toBe(true);
                });
            }),
        );
    });

    it("property: type variable IDs stay within configured range", () => {
        fc.assert(
            fc.property(typeArb({ maxVarId: 3 }), (t) => {
                for (const id of freeVarsOfType(t)) {
                    expect(id).toBeGreaterThanOrEqual(0);
                    expect(id).toBeLessThanOrEqual(3);
                }
            }),
        );
    });

    it("property: groundOnly produces no type variables", () => {
        fc.assert(
            fc.property(groundTypeArb, (t) => {
                expect(freeVarsOfType(t).size).toBe(0);
            }),
        );
    });

    it("property: primitives are drawn from the documented pool", () => {
        const primitives = new Set<string>(PRIMITIVE_TYPE_NAMES);
        fc.assert(
            fc.property(typeArb({ depth: 1 }), (t) => {
                if (t.type === "Const") {
                    expect(primitives.has(t.name)).toBe(true);
                }
            }),
        );
    });
});

describe("typeSchemeArb", () => {
    it("property: bound vars are a subset of the body's free vars", () => {
        fc.assert(
            fc.property(typeSchemeArb(), (scheme) => {
                const free = freeVarsOfType(scheme.type);
                for (const v of scheme.vars) {
                    expect(free.has(v)).toBe(true);
                }
            }),
        );
    });

    it("property: maxBoundVars is respected", () => {
        fc.assert(
            fc.property(typeSchemeArb({ maxBoundVars: 2 }), (scheme) => {
                expect(scheme.vars.length).toBeLessThanOrEqual(2);
            }),
        );
    });
});

describe("typeSubstitutionArb", () => {
    it("property: keys lie within MAX_VAR_ID", () => {
        fc.assert(
            fc.property(typeSubstitutionArb(), (subst) => {
                for (const id of subst.keys()) {
                    expect(id).toBeGreaterThanOrEqual(0);
                    expect(id).toBeLessThanOrEqual(MAX_VAR_ID);
                }
            }),
        );
    });

    it("property: ground-range substitution values contain no type variables", () => {
        fc.assert(
            fc.property(typeSubstitutionArb({ groundRange: true }), (subst) => {
                for (const value of subst.values()) {
                    expect(freeVarsOfType(value).size).toBe(0);
                }
            }),
        );
    });
});

describe("typeEnvArb", () => {
    it("property: generated environments contain only Value bindings", () => {
        fc.assert(
            fc.property(typeEnvArb(), (env) => {
                expect(env.types.size).toBe(0);
                for (const binding of env.values.values()) {
                    expect(binding.kind).toBe("Value");
                }
            }),
        );
    });
});

describe("constraintArb", () => {
    it("property: every constraint is Equality or Instance", () => {
        fc.assert(
            fc.property(constraintArb, (c) => {
                expect(c.kind === "Equality" || c.kind === "Instance").toBe(true);
            }),
        );
    });
});

describe("alphaEquivalent", () => {
    it("identifies a type as α-equivalent to itself", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                expect(alphaEquivalent(t, t)).toBe(true);
            }),
        );
    });

    it("differentiates types with mismatched constructor names", () => {
        expect(alphaEquivalent({ type: "Const", name: "Int" }, { type: "Const", name: "String" })).toBe(false);
    });

    it("respects the bijective renaming requirement", () => {
        // 'a -> 'a is α-equivalent to 'b -> 'b but not to 'b -> 'c.
        expect(
            alphaEquivalent(
                { type: "Fun", params: [{ type: "Var", id: 0, level: 0 }], return: { type: "Var", id: 0, level: 0 } },
                { type: "Fun", params: [{ type: "Var", id: 1, level: 0 }], return: { type: "Var", id: 1, level: 0 } },
            ),
        ).toBe(true);
        expect(
            alphaEquivalent(
                { type: "Fun", params: [{ type: "Var", id: 0, level: 0 }], return: { type: "Var", id: 0, level: 0 } },
                { type: "Fun", params: [{ type: "Var", id: 1, level: 0 }], return: { type: "Var", id: 2, level: 0 } },
            ),
        ).toBe(false);
    });
});

// `typeArb` deliberately omits `Union`, `Never`, `StringLit`, and `Module`
// — those variants have special unification semantics (subtyping with String,
// bottom-type behavior, nominal equality by path) that would break the
// soundness / reflexivity / α-equivalence properties driven by typeArb. The
// fixed unit tests below exercise the helpers (`freeVarsOfType`,
// `alphaEquivalent`) on those variants directly so the helper code paths
// still get coverage without polluting the property suites.
describe("freeVarsOfType — coverage for variants outside typeArb", () => {
    it("walks Variant constructor payloads", () => {
        const t: import("../environment.js").Type = {
            type: "Variant",
            name: "Opt",
            constructors: new Map<string, import("../environment.js").Type[]>([
                ["Some", [{ type: "Var", id: 1, level: 0 }]],
                [
                    "Pair",
                    [
                        { type: "Const", name: "Int" },
                        { type: "Var", id: 4, level: 0 },
                    ],
                ],
            ]),
        };
        expect(Array.from(freeVarsOfType(t)).sort((a, b) => a - b)).toEqual([1, 4]);
    });

    it("walks Ref inner type", () => {
        // The bare `Ref` discriminant is unreachable in `unify` (production
        // routes references through App<Const("Ref"), [inner]>), but the
        // `Type` union still includes it and the helper must walk it.
        const t: import("../environment.js").Type = {
            type: "Ref",
            inner: { type: "Var", id: 7, level: 0 },
        };
        expect(Array.from(freeVarsOfType(t))).toEqual([7]);
    });

    it("walks Union members", () => {
        const t: import("../environment.js").Type = {
            type: "Union",
            types: [
                { type: "Var", id: 3, level: 0 },
                { type: "Const", name: "Int" },
                { type: "Var", id: 5, level: 0 },
            ],
        };
        expect(Array.from(freeVarsOfType(t)).sort((a, b) => a - b)).toEqual([3, 5]);
    });

    it("returns empty for Never and StringLit (leaf shapes)", () => {
        expect(freeVarsOfType({ type: "Never" }).size).toBe(0);
        expect(freeVarsOfType({ type: "StringLit", value: "pending" }).size).toBe(0);
    });

    it("returns empty for Module by design (matches production freeTypeVars)", () => {
        // Production `typechecker/types.ts:freeTypeVars` intentionally
        // treats `Module` as a leaf because module exports are fully-
        // generalized schemes — every variable inside an export is bound
        // by that scheme's own `forall`, so none escape to the outer
        // scope. `freeVarsOfType` mirrors that decision so the parity
        // property in `typechecker/types.test.ts` ("freeTypeVars matches
        // the test-arb's freeVarsOfType helper") holds.
        const t: import("../environment.js").Type = {
            type: "Module",
            path: "@vibefun/std#Mod",
            exports: new Map([["foo", { vars: [], type: { type: "Var", id: 9, level: 0 } }]]),
        };
        expect(freeVarsOfType(t).size).toBe(0);
    });
});

describe("alphaEquivalent — coverage for variants outside typeArb", () => {
    it("walks Ref inner types", () => {
        // Two `Ref` types are α-equivalent iff their inners are. Type vars
        // inside a `Ref` should map under the same bijection as anywhere else.
        expect(
            alphaEquivalent(
                { type: "Ref", inner: { type: "Var", id: 0, level: 0 } },
                { type: "Ref", inner: { type: "Var", id: 9, level: 0 } },
            ),
        ).toBe(true);
        expect(
            alphaEquivalent(
                { type: "Ref", inner: { type: "Var", id: 0, level: 0 } },
                { type: "Ref", inner: { type: "Const", name: "Int" } },
            ),
        ).toBe(false);
    });

    it("treats two Never types as equivalent", () => {
        expect(alphaEquivalent({ type: "Never" }, { type: "Never" })).toBe(true);
    });

    it("respects StringLit value equality", () => {
        expect(alphaEquivalent({ type: "StringLit", value: "x" }, { type: "StringLit", value: "x" })).toBe(true);
        expect(alphaEquivalent({ type: "StringLit", value: "x" }, { type: "StringLit", value: "y" })).toBe(false);
    });

    it("compares Module types by path (nominal)", () => {
        const exports: Map<string, import("../environment.js").TypeScheme> = new Map();
        expect(
            alphaEquivalent(
                { type: "Module", path: "@vibefun/std#A", exports },
                { type: "Module", path: "@vibefun/std#A", exports },
            ),
        ).toBe(true);
        expect(
            alphaEquivalent(
                { type: "Module", path: "@vibefun/std#A", exports },
                { type: "Module", path: "@vibefun/std#B", exports },
            ),
        ).toBe(false);
    });

    it("walks Union members positionally", () => {
        const a: import("../environment.js").Type = {
            type: "Union",
            types: [
                { type: "Var", id: 0, level: 0 },
                { type: "Const", name: "Int" },
            ],
        };
        const b: import("../environment.js").Type = {
            type: "Union",
            types: [
                { type: "Var", id: 9, level: 0 },
                { type: "Const", name: "Int" },
            ],
        };
        const c: import("../environment.js").Type = {
            type: "Union",
            types: [
                { type: "Const", name: "Int" },
                { type: "Var", id: 9, level: 0 },
            ],
        };
        expect(alphaEquivalent(a, b)).toBe(true);
        expect(alphaEquivalent(a, c)).toBe(false);
    });

    it("rejects nominal Variant pairs whose names differ", () => {
        const ctors = new Map([["A", []]]);
        expect(
            alphaEquivalent(
                { type: "Variant", name: "Foo", constructors: ctors },
                { type: "Variant", name: "Bar", constructors: ctors },
            ),
        ).toBe(false);
    });
});

function walkTypes(t: import("../environment.js").Type, visit: (sub: import("../environment.js").Type) => void): void {
    visit(t);
    switch (t.type) {
        case "Var":
        case "Const":
        case "Never":
        case "StringLit":
        case "Module":
            return;
        case "Fun":
            t.params.forEach((p) => walkTypes(p, visit));
            walkTypes(t.return, visit);
            return;
        case "App":
            walkTypes(t.constructor, visit);
            t.args.forEach((a) => walkTypes(a, visit));
            return;
        case "Record":
            t.fields.forEach((f) => walkTypes(f, visit));
            return;
        case "Variant":
            t.constructors.forEach((cs) => cs.forEach((p) => walkTypes(p, visit)));
            return;
        case "Union":
            t.types.forEach((u) => walkTypes(u, visit));
            return;
        case "Tuple":
            t.elements.forEach((e) => walkTypes(e, visit));
            return;
        case "Ref":
            walkTypes(t.inner, visit);
            return;
    }
}
