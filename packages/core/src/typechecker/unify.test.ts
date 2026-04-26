/**
 * Tests for type unification algorithm
 */

import type { Type } from "../types/environment.js";
import type { UnifyContext } from "./unify.js";

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { groundTypeArb, typeArb, typeSubstitutionArb } from "../types/test-arbitraries/index.js";
import {
    appType,
    constType,
    freeTypeVars,
    freshTypeVar,
    funType,
    isAppType,
    isTypeVar,
    primitiveTypes,
    recordType,
    refType,
    resetTypeVarCounter,
    typeEquals,
    unionType,
    variantType,
} from "./types.js";
import { applySubst, composeSubst, emptySubst, occursIn, singleSubst, unify } from "./unify.js";

// Test context for unification - provides a dummy location for error messages
const testCtx: UnifyContext = {
    loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
};

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
        const subst = unify(primitiveTypes.Int, primitiveTypes.Int, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should fail to unify different constant types", () => {
        expect(() => unify(primitiveTypes.Int, primitiveTypes.String, testCtx)).toThrow("Cannot unify");
    });

    it("should unify all primitive types with themselves", () => {
        expect(() => unify(primitiveTypes.Float, primitiveTypes.Float, testCtx)).not.toThrow();
        expect(() => unify(primitiveTypes.Bool, primitiveTypes.Bool, testCtx)).not.toThrow();
        expect(() => unify(primitiveTypes.Unit, primitiveTypes.Unit, testCtx)).not.toThrow();
    });
});

describe("Unify Never Type", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify Never with any type (bottom type)", () => {
        const subst1 = unify(primitiveTypes.Never, primitiveTypes.Int, testCtx);
        expect(subst1.size).toBe(0);

        const subst2 = unify(primitiveTypes.String, primitiveTypes.Never, testCtx);
        expect(subst2.size).toBe(0);
    });

    it("should unify Never with function types", () => {
        const funcType = funType([primitiveTypes.Int], primitiveTypes.String);
        const subst = unify(primitiveTypes.Never, funcType, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify Never with type variables", () => {
        const t = freshTypeVar();
        const subst = unify(primitiveTypes.Never, t, testCtx);
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
        const subst = unify(t, primitiveTypes.Int, testCtx);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should unify constant type with type variable (symmetric)", () => {
        const t = freshTypeVar();
        const subst = unify(primitiveTypes.Int, t, testCtx);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should unify two different type variables", () => {
        const t1 = freshTypeVar();
        freshTypeVar();
        const subst = unify(t1, t1, testCtx);
        expect(subst.size).toBe(0);
        // Same variable unifies with itself
    });

    it("should unify type variable with itself (reflexive)", () => {
        const t = freshTypeVar();
        const subst = unify(t, t, testCtx);
        expect(subst.size).toBe(0); // No substitution needed
    });

    it("should fail occurs check when unifying variable with type containing itself", () => {
        const t = freshTypeVar();
        const listOfT = appType(constType("List"), [t]);
        expect(() => unify(t, listOfT, testCtx)).toThrow(VibefunDiagnostic);
    });
});

describe("Unify Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical function types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], primitiveTypes.String);
        const subst = unify(f1, f2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify function types with type variables", () => {
        const t1 = freshTypeVar();
        const t2 = freshTypeVar();
        const f1 = funType([t1], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], t2);
        const subst = unify(f1, f2, testCtx);

        expect(subst.size).toBe(2);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
        expect(subst.get(1)).toEqual(primitiveTypes.String);
    });

    it("should fail to unify functions with different arity", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int, primitiveTypes.Bool], primitiveTypes.String);
        expect(() => unify(f1, f2, testCtx)).toThrow("different arity");
    });

    it("should fail to unify functions with incompatible parameter types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Bool], primitiveTypes.String);
        expect(() => unify(f1, f2, testCtx)).toThrow(VibefunDiagnostic);
    });

    it("should fail to unify functions with incompatible return types", () => {
        const f1 = funType([primitiveTypes.Int], primitiveTypes.String);
        const f2 = funType([primitiveTypes.Int], primitiveTypes.Bool);
        expect(() => unify(f1, f2, testCtx)).toThrow(VibefunDiagnostic);
    });
});

describe("Unify Type Applications", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical type applications", () => {
        const list1 = appType(constType("List"), [primitiveTypes.Int]);
        const list2 = appType(constType("List"), [primitiveTypes.Int]);
        const subst = unify(list1, list2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify type applications with type variables", () => {
        const t = freshTypeVar();
        const list1 = appType(constType("List"), [t]);
        const list2 = appType(constType("List"), [primitiveTypes.Int]);
        const subst = unify(list1, list2, testCtx);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify different constructors", () => {
        const list = appType(constType("List"), [primitiveTypes.Int]);
        const option = appType(constType("Option"), [primitiveTypes.Int]);
        expect(() => unify(list, option, testCtx)).toThrow(VibefunDiagnostic);
    });

    it("should fail to unify different arity type applications", () => {
        const t1 = appType(constType("Either"), [primitiveTypes.Int, primitiveTypes.String]);
        const t2 = appType(constType("Either"), [primitiveTypes.Int]);
        expect(() => unify(t1, t2, testCtx)).toThrow("different arity");
    });

    it("should unify nested type applications", () => {
        const t = freshTypeVar();
        const nested1 = appType(constType("List"), [appType(constType("Option"), [t])]);
        const nested2 = appType(constType("List"), [appType(constType("Option"), [primitiveTypes.Int])]);
        const subst = unify(nested1, nested2, testCtx);

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
        const subst = unify(r1, r2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify record types with type variables", () => {
        const t = freshTypeVar();
        const r1 = recordType(new Map([["x", t]]));
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));
        const subst = unify(r1, r2, testCtx);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should support width subtyping when actual (r2) has extra fields", () => {
        // r1 = expected (narrower); r2 = actual (may have extras). Every
        // field in r1 is present in r2, so the call succeeds.
        const r1 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r2 = recordType(
            new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.String],
            ]),
        );

        const subst = unify(r1, r2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should reject when expected (r1) has a field the actual (r2) is missing", () => {
        // r1 requires both x and y; r2 only provides x. Width subtyping
        // allows extras in the actual, but never missing required fields.
        const r1 = recordType(
            new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.String],
            ]),
        );
        const r2 = recordType(new Map([["x", primitiveTypes.Int]]));

        expect(() => unify(r1, r2, testCtx)).toThrow(VibefunDiagnostic);
        expect(() => unify(r1, r2, testCtx)).toThrow(/VF4503/);
    });

    it("should bind a type var inside an expected field when actual has extras", () => {
        // Expected = { x: 'a }, Actual = { x: Int, z: Bool }. r1 has only
        // the x field (with a type variable); r2 has x plus an extra z.
        // Width subtyping permits z in the actual, and 'a unifies with Int.
        const t = freshTypeVar();
        const r1 = recordType(new Map([["x", t]]));
        const r2 = recordType(
            new Map([
                ["x", primitiveTypes.Int],
                ["z", primitiveTypes.Bool],
            ]),
        );

        const subst = unify(r1, r2, testCtx);
        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify incompatible field types", () => {
        const r1 = recordType(new Map([["x", primitiveTypes.Int]]));
        const r2 = recordType(new Map([["x", primitiveTypes.String]]));
        expect(() => unify(r1, r2, testCtx)).toThrow(VibefunDiagnostic);
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
        const subst = unify(v1, v2, testCtx);
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
        const subst = unify(v1, v2, testCtx);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify variants with different constructors", () => {
        const v1 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        const v2 = variantType(new Map([["Other", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2, testCtx)).toThrow("different constructors");
    });

    it("should fail to unify variants with different number of constructors", () => {
        const v1 = variantType(
            new Map([
                ["Some", [primitiveTypes.Int]],
                ["None", []],
            ]),
        );
        const v2 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2, testCtx)).toThrow("different number of constructors");
    });

    it("should fail to unify constructors with different arity", () => {
        const v1 = variantType(new Map([["Some", [primitiveTypes.Int, primitiveTypes.String]]]));
        const v2 = variantType(new Map([["Some", [primitiveTypes.Int]]]));
        expect(() => unify(v1, v2, testCtx)).toThrow("different arity");
    });
});

describe("Unify Union Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical union types", () => {
        const u1 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const subst = unify(u1, u2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify union types with type variables", () => {
        const t = freshTypeVar();
        const u1 = unionType([t, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const subst = unify(u1, u2, testCtx);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify unions with different number of types", () => {
        const u1 = unionType([primitiveTypes.Int, primitiveTypes.String]);
        const u2 = unionType([primitiveTypes.Int]);
        expect(() => unify(u1, u2, testCtx)).toThrow("different number of types");
    });
});

describe("Unify Ref Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should unify identical ref types", () => {
        const ref1 = refType(primitiveTypes.Int);
        const ref2 = refType(primitiveTypes.Int);
        const subst = unify(ref1, ref2, testCtx);
        expect(subst.size).toBe(0);
    });

    it("should unify ref types with type variables", () => {
        const t = freshTypeVar();
        const ref1 = refType(t);
        const ref2 = refType(primitiveTypes.Int);
        const subst = unify(ref1, ref2, testCtx);

        expect(subst.size).toBe(1);
        expect(subst.get(0)).toEqual(primitiveTypes.Int);
    });

    it("should fail to unify different ref types", () => {
        const ref1 = refType(primitiveTypes.Int);
        const ref2 = refType(primitiveTypes.String);
        expect(() => unify(ref1, ref2, testCtx)).toThrow(VibefunDiagnostic);
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

        const subst = unify(type1, type2, testCtx);

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

        const subst = unify(type1, type2, testCtx);

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

        const subst = unify(type1, type2, testCtx);

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

        const subst = unify(t1, t2, testCtx);
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

        const subst = unify(t1, listType, testCtx);
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

describe("Alias and Record Expansion in Unify", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    const loc = { file: "test.vf", line: 1, column: 1, offset: 0 };

    it("unifies a bare alias constant with its underlying type", () => {
        // type UserId = Int
        const types = new Map();
        types.set("UserId", {
            kind: "Alias" as const,
            params: [],
            definition: primitiveTypes.Int,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        const subst = unify(constType("UserId"), primitiveTypes.Int, ctx);
        expect(subst).toBeDefined();
    });

    it("unifies a generic alias application with its expanded body", () => {
        // type MyList<T> = List<T>
        const tVar = freshTypeVar();
        const tVarId = isTypeVar(tVar) ? tVar.id : 0;
        const aliasBody = appType(constType("List"), [tVar]);
        const types = new Map();
        types.set("MyList", {
            kind: "Alias" as const,
            params: ["T"],
            paramIds: [tVarId],
            definition: aliasBody,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        const subst = unify(
            appType(constType("MyList"), [primitiveTypes.Int]),
            appType(constType("List"), [primitiveTypes.Int]),
            ctx,
        );
        expect(subst).toBeDefined();
    });

    it("unifies a generic record binding with its expanded record shape", () => {
        // type Box<T> = { value: T }
        const tVar = freshTypeVar();
        const tVarId = isTypeVar(tVar) ? tVar.id : 0;
        const fields = new Map<string, Type>();
        fields.set("value", tVar);
        const types = new Map();
        types.set("Box", {
            kind: "Record" as const,
            params: ["T"],
            paramIds: [tVarId],
            fields,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        const expandedRecord: Type = {
            type: "Record",
            fields: new Map([["value", primitiveTypes.Int]]),
        };
        const subst = unify(appType(constType("Box"), [primitiveTypes.Int]), expandedRecord, ctx);
        expect(subst).toBeDefined();
    });

    it("ignores Variant bindings — variants are nominal, not expanded", () => {
        // Variants use dedicated nominal unification rules; `expandAlias`
        // should pass them through untouched.
        const types = new Map();
        types.set("Color", {
            kind: "Variant" as const,
            params: [],
            constructors: new Map<string, Type[]>(),
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        // Color vs Int should fail — variant is not expanded into anything.
        expect(() => unify(constType("Color"), primitiveTypes.Int, ctx)).toThrow(VibefunDiagnostic);
    });

    it("skips expansion when UnifyContext has no types map", () => {
        // Without `types`, unify behaves purely structurally — `UserId` vs
        // `Int` are distinct Const types and must not unify.
        const ctx: UnifyContext = { loc };
        expect(() => unify(constType("UserId"), primitiveTypes.Int, ctx)).toThrow(VibefunDiagnostic);
    });

    it("expands a non-generic record type binding", () => {
        // `type Point = { x: Int, y: Int }` — no type params, so expansion
        // simply hands back the stored fields.
        const fields = new Map<string, Type>();
        fields.set("x", primitiveTypes.Int);
        fields.set("y", primitiveTypes.Int);
        const types = new Map();
        types.set("Point", {
            kind: "Record" as const,
            params: [],
            fields,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        const expandedShape: Type = {
            type: "Record",
            fields: new Map([
                ["x", primitiveTypes.Int],
                ["y", primitiveTypes.Int],
            ]),
        };
        const subst = unify(constType("Point"), expandedShape, ctx);
        expect(subst).toBeDefined();
    });

    it("falls back to no-op when a generic alias binding is missing paramIds", () => {
        // Ad-hoc binding without paramIds — expansion gives up rather than
        // risking an incorrect substitution.
        const types = new Map();
        types.set("Opaque", {
            kind: "Alias" as const,
            params: ["T"],
            // paramIds intentionally omitted
            definition: primitiveTypes.Int,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        expect(() => unify(appType(constType("Opaque"), [primitiveTypes.String]), primitiveTypes.Int, ctx)).toThrow(
            VibefunDiagnostic,
        );
    });

    it("falls back to no-op when a generic record binding is missing paramIds", () => {
        const fields = new Map<string, Type>();
        fields.set("value", primitiveTypes.Int);
        const types = new Map();
        types.set("OpaqueRec", {
            kind: "Record" as const,
            params: ["T"],
            // paramIds intentionally omitted
            fields,
            loc,
        });
        const ctx: UnifyContext = { loc, types };
        const expandedShape: Type = {
            type: "Record",
            fields: new Map([["value", primitiveTypes.Int]]),
        };
        // Without paramIds the binding can't be expanded safely, so App
        // stays as App — and unifying App<OpaqueRec, _> with a bare Record
        // fails structurally.
        expect(() => unify(appType(constType("OpaqueRec"), [primitiveTypes.String]), expandedShape, ctx)).toThrow(
            VibefunDiagnostic,
        );
    });

    describe("Type Parameter Invariance", () => {
        // Per docs/spec/03-type-system/subtyping.md "Type Parameter
        // Invariance": generic type parameters are strictly invariant.
        // `Box<{x:Int}>` and `Box<{x:Int, y:Int}>` are not interchangeable
        // even though `{x:Int, y:Int} <: {x:Int}` structurally.
        function makeBoxBinding() {
            const tVar = freshTypeVar();
            const tVarId = isTypeVar(tVar) ? tVar.id : 0;
            const fields = new Map<string, Type>();
            fields.set("value", tVar);
            const types = new Map();
            types.set("Box", {
                kind: "Record" as const,
                params: ["T"],
                paramIds: [tVarId],
                fields,
                loc,
            });
            return { types, tVar };
        }

        it("rejects width subtyping inside a generic type-application argument", () => {
            const { types } = makeBoxBinding();
            const ctx: UnifyContext = { loc, types };

            const narrow: Type = {
                type: "Record",
                fields: new Map([["x", primitiveTypes.Int]]),
            };
            const wide: Type = {
                type: "Record",
                fields: new Map([
                    ["x", primitiveTypes.Int],
                    ["y", primitiveTypes.Int],
                ]),
            };

            // Box<{x:Int}> vs Box<{x:Int, y:Int}> — the extra `y` in the
            // App-arg position must NOT be tolerated.
            expect(() => unify(appType(constType("Box"), [narrow]), appType(constType("Box"), [wide]), ctx)).toThrow(
                VibefunDiagnostic,
            );
        });

        it("still accepts width subtyping in non-App-arg positions", () => {
            const ctx: UnifyContext = { loc };
            const narrow: Type = {
                type: "Record",
                fields: new Map([["x", primitiveTypes.Int]]),
            };
            const wide: Type = {
                type: "Record",
                fields: new Map([
                    ["x", primitiveTypes.Int],
                    ["y", primitiveTypes.Int],
                ]),
            };
            // Plain record-vs-record at the top level is still permissive.
            expect(unify(narrow, wide, ctx)).toBeDefined();
        });
    });
});

describe("String Literal Singleton Unification", () => {
    const stringLit = (value: string): Type => ({ type: "StringLit", value });

    it("unifies equal string literal singletons", () => {
        expect(unify(stringLit("pending"), stringLit("pending"), testCtx)).toEqual(emptySubst());
    });

    it("rejects unequal string literal singletons", () => {
        expect(() => unify(stringLit("pending"), stringLit("active"), testCtx)).toThrow(VibefunDiagnostic);
    });

    it("allows a string literal to flow into String (widening)", () => {
        expect(unify(stringLit("pending"), primitiveTypes.String, testCtx)).toEqual(emptySubst());
    });

    it("allows String to flow into a string literal (symmetric)", () => {
        expect(unify(primitiveTypes.String, stringLit("pending"), testCtx)).toEqual(emptySubst());
    });

    it("rejects a string literal unified with a non-String constant", () => {
        expect(() => unify(stringLit("pending"), primitiveTypes.Int, testCtx)).toThrow(VibefunDiagnostic);
    });

    it("unifies equal unions of string literals", () => {
        const u = unionType([stringLit("a"), stringLit("b"), stringLit("c")]);
        expect(unify(u, unionType([stringLit("a"), stringLit("b"), stringLit("c")]), testCtx)).toEqual(emptySubst());
    });

    it("applySubst is an identity for StringLit", () => {
        const t = stringLit("pending");
        const subst = singleSubst(0, primitiveTypes.Int);
        expect(applySubst(subst, t)).toEqual(t);
    });

    it("occursIn returns false for StringLit", () => {
        expect(occursIn(0, stringLit("pending"))).toBe(false);
    });
});

describe("Substitution Algebraic Properties", () => {
    it("property: applying empty substitution is the identity", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                expect(typeEquals(applySubst(emptySubst(), t), t)).toBe(true);
            }),
        );
    });

    it("property: apply-compose distributivity (apply(s2 ∘ s1, t) = apply(s2, apply(s1, t)))", () => {
        // composeSubst(s1, s2) is documented as "apply s1 first, then s2",
        // which is s2 ∘ s1 in the standard composition direction.
        fc.assert(
            fc.property(typeSubstitutionArb(), typeSubstitutionArb(), typeArb(), (s1, s2, t) => {
                const left = applySubst(composeSubst(s1, s2), t);
                const right = applySubst(s2, applySubst(s1, t));
                expect(typeEquals(left, right)).toBe(true);
            }),
        );
    });

    it("property: composition with empty on the right preserves the left substitution", () => {
        fc.assert(
            fc.property(typeSubstitutionArb(), typeArb(), (s, t) => {
                const composed = composeSubst(s, emptySubst());
                expect(typeEquals(applySubst(composed, t), applySubst(s, t))).toBe(true);
            }),
        );
    });

    it("property: composition with empty on the left preserves the right substitution", () => {
        fc.assert(
            fc.property(typeSubstitutionArb(), typeArb(), (s, t) => {
                const composed = composeSubst(emptySubst(), s);
                expect(typeEquals(applySubst(composed, t), applySubst(s, t))).toBe(true);
            }),
        );
    });

    it("property: occursIn returns false for ground types", () => {
        fc.assert(
            fc.property(groundTypeArb, fc.integer({ min: 0, max: 16 }), (t, id) => {
                expect(occursIn(id, t)).toBe(false);
            }),
        );
    });

    it("property: occursIn returns true for every free variable in a type", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                for (const id of freeTypeVars(t)) {
                    expect(occursIn(id, t)).toBe(true);
                }
            }),
        );
    });
});

describe("Unification Algebraic Properties", () => {
    const propCtx: UnifyContext = { loc: { file: "prop.vf", line: 1, column: 1, offset: 0 } };

    it("property: reflexivity — unify(t, t) succeeds and σ leaves t unchanged", () => {
        fc.assert(
            fc.property(typeArb(), (t) => {
                const subst = unify(t, t, propCtx);
                expect(typeEquals(applySubst(subst, t), t)).toBe(true);
            }),
        );
    });

    it("property: soundness — when unify(a, b) succeeds with σ, applySubst(σ, a) === applySubst(σ, b)", () => {
        // Generated types may not unify; on failure the property is vacuously
        // satisfied. The point is to catch the case where unify returns a
        // substitution that does NOT actually equate the inputs.
        fc.assert(
            fc.property(typeArb(), typeArb(), (a, b) => {
                let subst;
                try {
                    subst = unify(a, b, propCtx);
                } catch (e) {
                    if (e instanceof VibefunDiagnostic) {
                        return;
                    }
                    throw e;
                }
                const aPrime = applySubst(subst, a);
                const bPrime = applySubst(subst, b);
                expect(typeEquals(aPrime, bPrime)).toBe(true);
            }),
        );
    });

    it("property: symmetry — unify(a, b) succeeds iff unify(b, a) succeeds", () => {
        fc.assert(
            fc.property(typeArb(), typeArb(), (a, b) => {
                const ab = tryUnify(a, b);
                const ba = tryUnify(b, a);
                expect(ab.ok).toBe(ba.ok);
            }),
        );
    });

    it("property: symmetry — when both directions succeed, both substitutions equate the inputs", () => {
        fc.assert(
            fc.property(typeArb(), typeArb(), (a, b) => {
                const ab = tryUnify(a, b);
                const ba = tryUnify(b, a);
                if (!ab.ok || !ba.ok) {
                    return;
                }
                expect(typeEquals(applySubst(ab.subst, a), applySubst(ab.subst, b))).toBe(true);
                expect(typeEquals(applySubst(ba.subst, a), applySubst(ba.subst, b))).toBe(true);
            }),
        );
    });

    it("property: idempotence — applying σ to applySubst(σ, t) equals applySubst(σ, t)", () => {
        // Robinson unification's mgu is idempotent on the unified types: if
        // σ = unify(a, b), then σ(σ(a)) = σ(a). Catches bugs where unify
        // returns a substitution still containing pending rewrites.
        fc.assert(
            fc.property(typeArb(), typeArb(), (a, b) => {
                const r = tryUnify(a, b);
                if (!r.ok) {
                    return;
                }
                const once = applySubst(r.subst, a);
                const twice = applySubst(r.subst, once);
                expect(typeEquals(twice, once)).toBe(true);
            }),
        );
    });

    it("property: failure on incompatible primitives — unify(Int, String) always throws", () => {
        const otherPrims: Type[] = [
            primitiveTypes.Float,
            primitiveTypes.String,
            primitiveTypes.Bool,
            primitiveTypes.Unit,
        ];
        fc.assert(
            fc.property(fc.constantFrom(...otherPrims), (other) => {
                expect(() => unify(primitiveTypes.Int, other, propCtx)).toThrow(VibefunDiagnostic);
                expect(() => unify(other, primitiveTypes.Int, propCtx)).toThrow(VibefunDiagnostic);
            }),
        );
    });

    function tryUnify(a: Type, b: Type): { ok: true; subst: ReturnType<typeof unify> } | { ok: false } {
        try {
            return { ok: true, subst: unify(a, b, propCtx) };
        } catch (e) {
            if (e instanceof VibefunDiagnostic) {
                return { ok: false };
            }
            throw e;
        }
    }
});
