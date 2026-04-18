/**
 * Tests for the stdlib module-signature registry (phase 2.3).
 */

import type { Type } from "../../types/environment.js";

import { describe, expect, it } from "vitest";

import { schemeToString } from "../types.js";
import { getStdlibModuleNames, getStdlibModuleSignature, getStdlibRootSignature, STDLIB_ROOT_PATH } from "./index.js";

function expectModule(t: Type | null): Extract<Type, { type: "Module" }> {
    expect(t).not.toBeNull();
    expect(t!.type).toBe("Module");
    return t as Extract<Type, { type: "Module" }>;
}

describe("getStdlibModuleNames", () => {
    it("lists every stdlib module served by the registry", () => {
        expect(getStdlibModuleNames().sort()).toEqual(
            ["Float", "Int", "List", "Math", "Option", "Result", "String"].sort(),
        );
    });
});

describe("getStdlibModuleSignature", () => {
    it("returns null for unknown module names", () => {
        expect(getStdlibModuleSignature("NotAModule")).toBeNull();
    });

    it("returns a Module type for each known stdlib module", () => {
        for (const name of getStdlibModuleNames()) {
            const sig = expectModule(getStdlibModuleSignature(name));
            expect(sig.path).toBe(`@vibefun/std#${name}`);
        }
    });

    it("List module exports all 9 spec functions", () => {
        const sig = expectModule(getStdlibModuleSignature("List"));
        expect(Array.from(sig.exports.keys()).sort()).toEqual(
            ["concat", "filter", "fold", "foldRight", "head", "length", "map", "reverse", "tail"].sort(),
        );
    });

    it("List.map has curried data-first scheme", () => {
        const sig = expectModule(getStdlibModuleSignature("List"));
        const mapScheme = sig.exports.get("map")!;
        // forall 'a 'b. List<'a> -> ('a -> 'b) -> List<'b>. Assert on the AST
        // shape directly — schemeToString omits disambiguating parens on
        // function-typed parameters, so matching the surface string is lossy.
        expect(mapScheme.vars.length).toBe(2);
        const t = mapScheme.type;
        expect(t.type).toBe("Fun");
        if (t.type !== "Fun") return;
        // outer: List<a> -> ...
        expect(t.params[0]!.type).toBe("App");
        if (t.params[0]!.type !== "App") return;
        expect((t.params[0]!.constructor as { type: "Const"; name: string }).name).toBe("List");
        // return: (a -> b) -> List<b>
        expect(t.return.type).toBe("Fun");
        if (t.return.type !== "Fun") return;
        expect(t.return.params[0]!.type).toBe("Fun");
        expect(t.return.return.type).toBe("App");
        const s = schemeToString(mapScheme);
        expect(s).toMatch(/forall/);
        expect(s).toMatch(/List</);
    });

    it("Option module exports map/flatMap/getOrElse/isSome/isNone/unwrap", () => {
        const sig = expectModule(getStdlibModuleSignature("Option"));
        expect(Array.from(sig.exports.keys()).sort()).toEqual(
            ["flatMap", "getOrElse", "isNone", "isSome", "map", "unwrap"].sort(),
        );
    });

    it("Result module exports 7 spec functions", () => {
        const sig = expectModule(getStdlibModuleSignature("Result"));
        expect(sig.exports.size).toBe(7);
        expect(sig.exports.has("map")).toBe(true);
        expect(sig.exports.has("flatMap")).toBe(true);
        expect(sig.exports.has("mapErr")).toBe(true);
        expect(sig.exports.has("isOk")).toBe(true);
        expect(sig.exports.has("isErr")).toBe(true);
        expect(sig.exports.has("unwrap")).toBe(true);
        expect(sig.exports.has("unwrapOr")).toBe(true);
    });

    it("String module exports all 13 spec functions", () => {
        const sig = expectModule(getStdlibModuleSignature("String"));
        expect(sig.exports.size).toBe(13);
    });

    it("Int module exports toString/toFloat/abs/max/min", () => {
        const sig = expectModule(getStdlibModuleSignature("Int"));
        expect(Array.from(sig.exports.keys()).sort()).toEqual(["abs", "max", "min", "toFloat", "toString"].sort());
    });

    it("Float module exports toString/toInt/round/floor/ceil/abs", () => {
        const sig = expectModule(getStdlibModuleSignature("Float"));
        expect(Array.from(sig.exports.keys()).sort()).toEqual(
            ["abs", "ceil", "floor", "round", "toInt", "toString"].sort(),
        );
    });

    it("returns a fresh signature each call (fresh type vars per import)", () => {
        const a = expectModule(getStdlibModuleSignature("List"));
        const b = expectModule(getStdlibModuleSignature("List"));
        // The returned objects must not be the same reference — fresh vars
        // matter because imports at different sites would otherwise alias.
        expect(a).not.toBe(b);
        expect(a.exports).not.toBe(b.exports);
    });
});

describe("getStdlibRootSignature", () => {
    it("returns a Module rooted at __std__", () => {
        const root = getStdlibRootSignature();
        expect(root.type).toBe("Module");
        if (root.type !== "Module") return;
        expect(root.path).toBe(STDLIB_ROOT_PATH);
    });

    it("exposes every stdlib module as a field", () => {
        const root = getStdlibRootSignature();
        if (root.type !== "Module") throw new Error("expected Module");
        for (const name of getStdlibModuleNames()) {
            const field = root.exports.get(name);
            expect(field).toBeDefined();
            expect(field!.vars.length).toBe(0);
            expect(field!.type.type).toBe("Module");
        }
    });

    it("__std__.List field is a Module typed at @vibefun/std#List", () => {
        const root = getStdlibRootSignature();
        if (root.type !== "Module") throw new Error("expected Module");
        const listField = root.exports.get("List")!;
        if (listField.type.type !== "Module") throw new Error("expected Module");
        expect(listField.type.path).toBe("@vibefun/std#List");
    });
});
