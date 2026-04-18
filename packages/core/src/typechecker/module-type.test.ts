/**
 * Tests for the `Module` kind in the Type union (Package D phase 2.2).
 *
 * Module types are nominal: two Module types unify iff their `path` matches.
 * Their `exports` hold TypeSchemes (not plain types), so substitution and
 * free-variable analysis treat modules as opaque closed values.
 */

import type { Type, TypeScheme } from "../types/environment.js";
import type { UnifyContext } from "./unify.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { typeToString } from "./format.js";
import { substituteTypeVars } from "./infer/infer-context.js";
import {
    freeTypeVars,
    freeTypeVarsAtLevel,
    freshTypeVar,
    funType,
    isModuleType,
    moduleType,
    primitiveTypes,
    resetTypeVarCounter,
    typeEquals,
} from "./types.js";
import { applySubst, occursIn, singleSubst, unify } from "./unify.js";

const loc: UnifyContext = { loc: { file: "test.vf", line: 1, column: 1, offset: 0 } };

function scheme(type: Type, vars: number[] = []): TypeScheme {
    return { vars, type };
}

function stdlibListSignature(): Type {
    // minimal signature for testing: { map: forall 't0 't1. ('t0 -> 't1) -> 't0 -> 't1 }
    const t0 = freshTypeVar();
    const t1 = freshTypeVar();
    const t0Id = t0.type === "Var" ? t0.id : 0;
    const t1Id = t1.type === "Var" ? t1.id : 0;
    const mapType = funType([funType([t0], t1)], funType([t0], t1));
    const exports = new Map<string, TypeScheme>();
    exports.set("map", scheme(mapType, [t0Id, t1Id]));
    return moduleType("@vibefun/std#List", exports);
}

describe("moduleType / isModuleType", () => {
    beforeEach(() => resetTypeVarCounter());

    it("constructs a Module type with the given path and exports", () => {
        const t = stdlibListSignature();
        expect(t.type).toBe("Module");
        if (t.type !== "Module") return;
        expect(t.path).toBe("@vibefun/std#List");
        expect(t.exports.has("map")).toBe(true);
    });

    it("isModuleType narrows correctly", () => {
        expect(isModuleType(stdlibListSignature())).toBe(true);
        expect(isModuleType(primitiveTypes.Int)).toBe(false);
    });
});

describe("typeEquals on Module", () => {
    beforeEach(() => resetTypeVarCounter());

    it("returns true when paths match (ignoring exports)", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        const b = moduleType("@vibefun/std#List", new Map([["map", scheme(primitiveTypes.Int)]]));
        expect(typeEquals(a, b)).toBe(true);
    });

    it("returns false when paths differ", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        const b = moduleType("@vibefun/std#String", new Map());
        expect(typeEquals(a, b)).toBe(false);
    });

    it("returns false against non-module types", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        expect(typeEquals(a, primitiveTypes.Int)).toBe(false);
    });
});

describe("unify on Module", () => {
    beforeEach(() => resetTypeVarCounter());

    it("unifies modules with the same path", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        const b = moduleType("@vibefun/std#List", new Map());
        expect(unify(a, b, loc).size).toBe(0);
    });

    it("rejects modules with different paths", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        const b = moduleType("@vibefun/std#String", new Map());
        expect(() => unify(a, b, loc)).toThrow(VibefunDiagnostic);
    });

    it("rejects a module unified with a primitive", () => {
        const a = moduleType("@vibefun/std#List", new Map());
        expect(() => unify(a, primitiveTypes.Int, loc)).toThrow(VibefunDiagnostic);
    });

    it("unifies a type variable with a module (occurs-free)", () => {
        const t = freshTypeVar();
        const id = t.type === "Var" ? t.id : 0;
        const m = moduleType("@vibefun/std#List", new Map());
        const subst = unify(t, m, loc);
        expect(applySubst(subst, t)).toEqual(m);
        expect(applySubst(subst, freshTypeVar())).not.toEqual(m);
        void id;
    });
});

describe("applySubst / occursIn / free vars on Module", () => {
    beforeEach(() => resetTypeVarCounter());

    it("applySubst is a no-op on Module", () => {
        const m = stdlibListSignature();
        const s = singleSubst(0, primitiveTypes.Int);
        expect(applySubst(s, m)).toBe(m);
    });

    it("occursIn returns false for any type var vs. a Module", () => {
        const m = stdlibListSignature();
        expect(occursIn(0, m)).toBe(false);
        expect(occursIn(1, m)).toBe(false);
    });

    it("freeTypeVars reports no free variables on a Module (schemes are closed)", () => {
        const m = stdlibListSignature();
        expect(freeTypeVars(m).size).toBe(0);
    });

    it("freeTypeVarsAtLevel reports no free variables at any level", () => {
        const m = stdlibListSignature();
        expect(freeTypeVarsAtLevel(m, 0).size).toBe(0);
        expect(freeTypeVarsAtLevel(m, 99).size).toBe(0);
    });

    it("substituteTypeVars is a no-op on Module", () => {
        const m = stdlibListSignature();
        const mapping = new Map<number, Type>([[0, primitiveTypes.Int]]);
        expect(substituteTypeVars(m, mapping)).toBe(m);
    });
});

describe("typeToString on Module", () => {
    it('formats as module "path"', () => {
        const m = moduleType("@vibefun/std#List", new Map());
        expect(typeToString(m)).toBe('module "@vibefun/std#List"');
    });
});
