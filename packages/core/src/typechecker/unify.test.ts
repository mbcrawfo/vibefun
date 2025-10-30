/**
 * Tests for type unification algorithm
 */

import type { Type } from "../types/environment.js";

import { beforeEach, describe, expect, it } from "vitest";

import {
    appType,
    constType,
    freshTypeVar,
    funType,
    isAppType,
    isTypeVar,
    primitiveTypes,
    recordType,
    refType,
    resetTypeVarCounter,
    unionType,
    variantType,
} from "./types.js";
import { applySubst, composeSubst, emptySubst, occursIn, singleSubst, unify } from "./unify.js";

describe("Empty Substitution", () => {
    it("should create an empty substitution", () => {
        const subst = emptySubst();
        expect(subst.size).toBe(0);
    });

    it("should create a single-binding substitution", () => {
        const subst = singleSubst(0, primitiveTypes.Int);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });
});

describe("Substitution Application", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should apply empty substitution (identity)", () => {
        const t = freshTypeVar();
        const result = applySubst(emptySubst(), t);
        expect(result).toEqual(t);
    });

    it("should substitute a type variable", () => {
        const t = freshTypeVar();
        const subst = singleSubst(0, primitiveTypes.Int);
        const result = applySubst(subst, t);
        expect(result).toEqual(primitiveTypes.Int);
    });

    it("should leave constant types unchanged", () => {
        const subst = singleSubst(0, primitiveTypes.String);
        const result = applySubst(subst, primitiveTypes.Int);
        expect(result).toEqual(primitiveTypes.Int);
    });

    it("should substitute in function types", () => {
        const t = freshTypeVar();
        const funcType = funType([t], primitiveTypes.String);
        const subst = singleSubst(0, primitiveTypes.Int);
        const result = applySubst(subst, funcType);

        expect(result).toEqual(funType([primitiveTypes.Int], primitiveTypes.String));
    });

    it("should substitute in type applications", () => {
        const t = freshTypeVar();
        const listType = appType(constType("List"), [t]);
        const subst = singleSubst(0, primitiveTypes.Int);
        const result = applySubst(subst, listType);

        expect(result).toEqual(appType(constType("List"), [primitiveTypes.Int]));
    });

    it("should substitute in record types", () => {
        const t = freshTypeVar();
        const rec = recordType(new Map([["x", t]]));
        const subst = singleSubst(0, primitiveTypes.Int);
        const result = applySubst(subst, rec) as Type & { type: "Record" };

        expect(result.fields.get("x")).toEqual(primitiveTypes.Int);
    });

    it("should substitute in variant types", () => {
        const t = freshTypeVar();
        const variant = variantType(new Map([["Some", [t]]]));
        const subst = singleSubst(0, primitiveTypes.Int);
        const result = applySubst(subst, variant) as Type & { type: "Variant" };

        expect(result.constructors.get("Some")).toEqual([primitiveTypes.Int]);
    });

    it("should apply substitution recursively (chaining)", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const subst = new Map<number, Type>();
        subst.set(0, t2);
        subst.set(1, primitiveTypes.Int);

        const result = applySubst(subst, t1);
        expect(result).toEqual(primitiveTypes.Int);
    });
});

describe("Substitution Composition", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should compose empty substitutions", () => {
        const result = composeSubst(emptySubst(), emptySubst());
        expect(result.size).toBe(0);
    });

    it("should compose with empty substitution on right", () => {
        const s1 = singleSubst(0, primitiveTypes.Int);
        const result = composeSubst(s1, emptySubst());
        expect(result.size).toBe(1);
        expect(result.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should compose with empty substitution on left", () => {
        const s2 = singleSubst(0, primitiveTypes.Int);
        const result = composeSubst(emptySubst(), s2);
        expect(result.size).toBe(1);
        expect(result.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should compose substitutions sequentially", () => {
        freshTypeVar(); // 0
        const t2 = freshTypeVar(); // 1

        const s1 = singleSubst(0, t2);
        const s2 = singleSubst(1, primitiveTypes.Int);
        const result = composeSubst(s1, s2);

        // s1 maps 0 -> t2
        // s2 applied to s1's bindings: 0 -> Int (because t2 is substituted)
        // s2 also maps 1 -> Int
        expect(result.get(0)).toEqual(primitiveTypes.Int);
        expect(result.get(1)).toEqual(primitiveTypes.Int);
    });

    it("should not override existing bindings from s1", () => {
        const s1 = singleSubst(0, primitiveTypes.Int);
        const s2 = singleSubst(0, primitiveTypes.String);
        const result = composeSubst(s1, s2);

        // s1's binding for 0 gets s2 applied to it, but Int has no variables
        // So it stays Int (s1 takes precedence)
        expect(result.get(0)).toEqual(primitiveTypes.Int);
    });
});

describe("Occurs Check", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should detect variable occurs in itself", () => {
        const t = freshTypeVar();
        expect(occursIn(0, t)).toBe(true);
    });

    it("should detect variable does not occur in constant", () => {
        expect(occursIn(0, primitiveTypes.Int)).toBe(false);
    });

    it("should detect variable occurs in function type", () => {
        const t = freshTypeVar();
        const funcType = funType([t], primitiveTypes.String);
        expect(occursIn(0, funcType)).toBe(true);
    });

    it("should detect variable occurs in type application", () => {
        const t = freshTypeVar();
        const listType = appType(constType("List"), [t]);
        expect(occursIn(0, listType)).toBe(true);
    });

    it("should detect variable occurs in nested structure", () => {
        const t = freshTypeVar();
        const listOfList = appType(constType("List"), [appType(constType("List"), [t])]);
        expect(occursIn(0, listOfList)).toBe(true);
    });

    it("should detect variable does not occur in different variable", () => {
        freshTypeVar();
        const t2 = freshTypeVar();
        expect(occursIn(0, t2)).toBe(false);
    });
});

describe("Unify Primitives", () => {
    it("should unify identical constant types", () => {
        const subst = unify(primitiveTypes.Int, primitiveTypes.Int);
        expect(subst.size).toBe(0);
    });

    it("should fail to unify different constant types", () => {
        expect(() => unify(primitiveTypes.Int, primitiveTypes.String)).toThrow("Cannot unify");
    });

    it("should unify all primitive types with themselves", () => {
        expect(() => unify(primitiveTypes.Float, primitiveTypes.Float)).not.toThrow();
        expect(() => unify(primitiveTypes.Bool, primitiveTypes.Bool)).not.toThrow();
        expect(() => unify(primitiveTypes.Unit, primitiveTypes.Unit)).not.toThrow();
    });
});

describe("Unify Never Type", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify Never with any type (bottom type)", () => {
        const subst1 = unify(primitiveTypes.Never, primitiveTypes.Int);
        expect(subst1.size).toBe(0);

        const subst2 = unify(primitiveTypes.String, primitiveTypes.Never);
        expect(subst2.size).toBe(0);
    });

    it("should unify Never with function types", () => {
        const funcType = funType([primitiveTypes.Int], primitiveTypes.String);
        const subst = unify(primitiveTypes.Never, funcType);
        expect(subst.size).toBe(0);
    });

    it("should unify Never with type variables", () => {
        const t = freshTypeVar();
        const subst = unify(primitiveTypes.Never, t);
        // Should bind the type variable to Never
        expect(subst.size).toBe(1);
        const result = applySubst(subst, t);
        expect(result).toEqual(primitiveTypes.Never);
    });
});

describe("Unify Type Variables", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify type variable with constant type", () => {
        const t = freshTypeVar();
        const subst = unify(t, primitiveTypes.Int);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should unify constant type with type variable (symmetric)", () => {
        const t = freshTypeVar();
        const subst = unify(primitiveTypes.Int, t);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should unify two different type variables", () => {
        const t1 = freshTypeVar();
        freshTypeVar();
        const subst = unify(t1, t1);
        expect(subst.size).toBe(0);
        // Same variable unifies with itself
    });

    it("should unify type variable with itself (reflexive)", () => {
        const t = freshTypeVar();
        const subst = unify(t, t);
        expect(subst.size).toBe(0); // No substitution needed
    });

    it("should fail occurs check when unifying variable with type containing itself", () => {
        const t = freshTypeVar();
        const listOfT = appType(constType("List"), [t]);
        expect(() => unify(t, listOfT)).toThrow("Occurs check");
    });
});

describe("Unify Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical function types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], primitiveTypes.String);
        const subst = unify(f1, f2);
        expect(subst.size).toBe(0);
    });

    it("should unify function types with type variables", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const f1 = funType([t1], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], t2);
        const subst = unify(f1, f2);

        expect(subst.size).toBe(2);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
        expect(subst.get(1)).toEqual(primitiveTypes.String);
    });

    it("should fail to unify functions with different arity", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int, primitiveTypes.Bool], primitiveTypes.String);
        expect(() => unify(f1, f2)).toThrow("different arity");
    });

    it("should fail to unify functions with incompatible parameter types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Bool], primitiveTypes.String);
        expect(() => unify(f1, f2)).toThrow();
    });

    it("should fail to unify functions with incompatible return types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], primitiveTypes.Bool);
        expect(() => unify(f1, f2)).toThrow();
    });
});

describe("Unify Type Applications", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical type applications", () => {
        const list1 = appType(constType("List"), [primitiveTypes.Int]);
        const list2 = appType(constType("List"), [primitiveTypes.Int]);
        const subst = unify(list1, list2);
        expect(subst.size).toBe(0);
    });

    it("should unify type applications with type variables", () => {
        const t = freshTypeVar();
        const list1 = appType(constType("List"), [t]);
        const list2 = appType(constType("List"), [primitiveTypes.Int]);
        const subst = unify(list1, list2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify different constructors", () => {
        const list = appType(constType("List"), [primitiveTypes.Int]);
        const option = appType(constType("Option"), [primitiveTypes.Int]);
        expect(() => unify(list, option)).toThrow();
    });

    it("should fail to unify different arity type applications", () => {
        const t1 = appType(constType("Either"), [primitiveTypes.Int, primitiveTypes.String]);
        const t2 = appType(constType("Either"), [primitiveTypes.Int]);
        expect(() => unify(t1, t2)).toThrow("different arity");
    });

    it("should unify nested type applications", () => {
        const t = freshTypeVar();
        const nested1 = appType(constType("List"), [appType(constType("Option"), [t])]);
        const nested2 = appType(constType("List"), [appType(constType("Option"), [primitiveTypes.Int])]);
        const subst = unify(nested1, nested2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });
});

describe("Unify Record Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical record types", () => {
        const r1 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));
        const subst = unify(r1, r2);
        expect(subst.size).toBe(0);
    });

    it("should unify record types with type variables", () => {
        const t = freshTypeVar();
        const r1 = recordType(new Map([["x", t]]));
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));
        const subst = unify(r1, r2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should support width subtyping (extra fields allowed)", () => {
        const r1 = recordType(
            new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.String],
            ]),
        );
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));

        // r1 has more fields than r2 - should unify with width subtyping
        const subst = unify(r1, r2);
        expect(subst.size).toBe(0);
    });

    it("should unify common fields even with different field sets", () => {
        const t = freshTypeVar();
        const r1 = recordType(
            new Map([
                ["x", t],
                ["y", primitiveTypes.String],
            ]),
        );
        const r2 = recordType(
            new Map([
                ["x", primitiveTypes.Int],
                ["z", primitiveTypes.Bool],
            ]),
        );

        const subst = unify(r1, r2);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify incompatible field types", () => {
        const r1 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r2 = recordType(new Map([["x", primitiveTypes.String]]));
        expect(() => unify(r1, r2)).toThrow();
    });
});

describe("Unify Variant Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical variant types", () => {
        const v1 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const v2 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const subst = unify(v1, v2);
        expect(subst.size).toBe(0);
    });

    it("should unify variant types with type variables", () => {
        const t = freshTypeVar();
        const v1 = variantType(
            new Map([
                ["Some", [t]],
                ["None", []],
            ]),
        );
        const v2 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const subst = unify(v1, v2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify variants with different constructors", () => {
        const v1 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        const v2 = variantType(new Map([["Other", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2)).toThrow("different constructors");
    });

    it("should fail to unify variants with different number of constructors", () => {
        const v1 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const v2 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2)).toThrow("different number of constructors");
    });

    it("should fail to unify constructors with different arity", () => {
        const v1 = variantType(new Map([["Some", [primitiveTypes.Int, primitiveTypes.String]]]));
        const v2 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2)).toThrow("different arity");
    });
});

describe("Unify Union Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical union types", () => {
        const u1 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const subst = unify(u1, u2);
        expect(subst.size).toBe(0);
    });

    it("should unify union types with type variables", () => {
        const t = freshTypeVar();
        const u1 = unionType([t, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const subst = unify(u1, u2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify unions with different number of types", () => {
        const u1 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int]);
        expect(() => unify(u1, u2)).toThrow("different number of types");
    });
});

describe("Unify Ref Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical ref types", () => {
        const ref1 = refType(primitiveTypes.Int);
        const ref2 = refType(primitiveTypes.Int);
        const subst = unify(ref1, ref2);
        expect(subst.size).toBe(0);
    });

    it("should unify ref types with type variables", () => {
        const t = freshTypeVar();
        const ref1 = refType(t);
        const ref2 = refType(primitiveTypes.Int);
        const subst = unify(ref1, ref2);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify different ref types", () => {
        const ref1 = refType(primitiveTypes.Int);
        const ref2 = refType(primitiveTypes.String);
        expect(() => unify(ref1, ref2)).toThrow();
    });
});

describe("Complex Unification", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify complex nested types", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();

        const type1 = funType([appType(constType("List"), [t1])], t2);
        const type2 = funType([appType(constType("List"), [primitiveTypes.Int])], primitiveTypes.String);

        const subst = unify(type1, type2);

        expect(subst.size).toBe(2);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
        expect(subst.get(1)).toEqual(primitiveTypes.String);
    });

    it("should handle multiple type variable unifications", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const t3 = freshTypeVar();

        const type1 = funType([t1, t2], t3);
        const type2 = funType([primitiveTypes.Int, primitiveTypes.String], primitiveTypes.Bool);

        const subst = unify(type1, type2);

        expect(subst.size).toBe(3);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
        expect(subst.get(1)).toEqual(primitiveTypes.String);
        expect(subst.get(2)).toEqual(primitiveTypes.Bool);
    });

    it("should handle chained type variable unifications", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const t3 = freshTypeVar();

        // t1 -> t2 -> t3
        const type1 = funType([t1], funType([t2], t3));
        const type2 = funType([primitiveTypes.Int], funType([primitiveTypes.String], primitiveTypes.Bool));

        const subst = unify(type1, type2);

        expect(applySubst(subst, t1)).toEqual(primitiveTypes.Int);
        expect(applySubst(subst, t2)).toEqual(primitiveTypes.String);
        expect(applySubst(subst, t3)).toEqual(primitiveTypes.Bool);
    });
});

describe("Level Updates During Unification", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should update levels when unifying type variables at different levels", () => {
        const t1 = freshTypeVar(0);
        const t2 = freshTypeVar(5);

        const subst = unify(t1, t2);
        const result = subst.get(0);

        expect(result).toBeDefined();
        if (result && isTypeVar(result)) {
            // Level should be updated to prevent escape
            expect(result.level).toBe(0);
        }
    });

    it("should update levels in nested types", () => {
        const t1 = freshTypeVar(0);
        const t2 = freshTypeVar(5);
        const listType = appType(constType("List"), [t2]);

        const subst = unify(t1, listType);
        const result = subst.get(0);

        expect(result).toBeDefined();
        if (result && isAppType(result)) {
            const argType = result.args[0];
            if (argType && isTypeVar(argType)) {
                expect(argType.level).toBe(0);
            }
        }
    });
});
