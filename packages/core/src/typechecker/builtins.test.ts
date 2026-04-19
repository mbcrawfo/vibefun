/**
 * Tests for built-in type constructors, variant definitions, and the
 * (deliberately small) ambient value environment.
 *
 * Stdlib function signatures (String.*, List.*, Option.*, Result.*, Int.*,
 * Float.*, Math.*) are no longer ambient as of phase 2.6; they are
 * exposed through the signature registry and reached via explicit
 * `import { List } from "@vibefun/std"`. Those signatures have their own
 * tests in ./module-signatures/index.test.ts — this file only covers what
 * remains ambient (variant constructors, panic, ref).
 */

import { beforeEach, describe, expect, it } from "vitest";

import { getBuiltinEnv, getBuiltinTypes, listType, optionType, resultType } from "./builtins.js";
import { primitiveTypes, resetTypeVarCounter } from "./types.js";

describe("Type Constructors", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should create List<T> type", () => {
        const listInt = listType(primitiveTypes.Int);
        expect(listInt.type).toBe("App");
        if (listInt.type === "App") {
            expect(listInt.constructor).toEqual({ type: "Const", name: "List" });
            expect(listInt.args).toHaveLength(1);
            expect(listInt.args[0]).toEqual(primitiveTypes.Int);
        }
    });

    it("should create Option<T> type", () => {
        const optionString = optionType(primitiveTypes.String);
        expect(optionString.type).toBe("App");
        if (optionString.type === "App") {
            expect(optionString.constructor).toEqual({ type: "Const", name: "Option" });
            expect(optionString.args).toHaveLength(1);
            expect(optionString.args[0]).toEqual(primitiveTypes.String);
        }
    });

    it("should create Result<T, E> type", () => {
        const resultIntString = resultType(primitiveTypes.Int, primitiveTypes.String);
        expect(resultIntString.type).toBe("App");
        if (resultIntString.type === "App") {
            expect(resultIntString.constructor).toEqual({ type: "Const", name: "Result" });
            expect(resultIntString.args).toHaveLength(2);
            expect(resultIntString.args[0]).toEqual(primitiveTypes.Int);
            expect(resultIntString.args[1]).toEqual(primitiveTypes.String);
        }
    });
});

describe("Built-in Type Definitions", () => {
    it("should define List<T> variant type", () => {
        const types = getBuiltinTypes();
        const listDef = types.get("List");

        expect(listDef).toBeDefined();
        expect(listDef?.kind).toBe("Variant");
        expect(listDef?.params).toEqual(["T"]);
        expect(listDef?.constructors.has("Cons")).toBe(true);
        expect(listDef?.constructors.has("Nil")).toBe(true);
    });

    it("should define Option<T> variant type", () => {
        const types = getBuiltinTypes();
        const optionDef = types.get("Option");

        expect(optionDef).toBeDefined();
        expect(optionDef?.kind).toBe("Variant");
        expect(optionDef?.params).toEqual(["T"]);
        expect(optionDef?.constructors.has("Some")).toBe(true);
        expect(optionDef?.constructors.has("None")).toBe(true);
    });

    it("should define Result<T, E> variant type", () => {
        const types = getBuiltinTypes();
        const resultDef = types.get("Result");

        expect(resultDef).toBeDefined();
        expect(resultDef?.kind).toBe("Variant");
        expect(resultDef?.params).toEqual(["T", "E"]);
        expect(resultDef?.constructors.has("Ok")).toBe(true);
        expect(resultDef?.constructors.has("Err")).toBe(true);
    });
});

describe("Built-in Environment", () => {
    it("should include all variant constructors", () => {
        const env = getBuiltinEnv();

        expect(env.has("Cons")).toBe(true);
        expect(env.has("Nil")).toBe(true);
        expect(env.has("Some")).toBe(true);
        expect(env.has("None")).toBe(true);
        expect(env.has("Ok")).toBe(true);
        expect(env.has("Err")).toBe(true);
    });

    it("should include special functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("panic")).toBe(true);
        expect(env.has("ref")).toBe(true);
    });

    it("should NOT expose stdlib functions as ambient", () => {
        // Phase 2.6: stdlib functions moved behind `import { … } from
        // "@vibefun/std"`. getBuiltinEnv() deliberately omits them.
        const env = getBuiltinEnv();
        for (const name of ["List.map", "Option.map", "Result.map", "String.length", "Int.abs", "Float.abs"]) {
            expect(env.has(name)).toBe(false);
        }
    });

    it("should have exactly 8 built-in values", () => {
        const env = getBuiltinEnv();
        // 6 variant constructors + panic + ref = 8.
        // __std__ is injected by buildEnvironment, not getBuiltinEnv.
        expect(env.size).toBe(8);
    });
});

describe("List Constructor Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Cons constructor", () => {
        const env = getBuiltinEnv();
        const cons = env.get("Cons");

        expect(cons).toBeDefined();
        expect(cons?.vars.length).toBeGreaterThan(0);
        expect(cons?.type.type).toBe("Fun");
    });

    it("should have polymorphic Nil constructor", () => {
        const env = getBuiltinEnv();
        const nil = env.get("Nil");

        expect(nil).toBeDefined();
        expect(nil?.vars.length).toBeGreaterThan(0);
        // Nil is a nullary value of type List<T>, not a zero-arg function.
        expect(nil?.type.type).toBe("App");
    });

    it("should have Cons take two parameters", () => {
        const env = getBuiltinEnv();
        const cons = env.get("Cons");

        expect(cons?.type.type).toBe("Fun");
        if (cons?.type.type === "Fun") {
            expect(cons.type.params).toHaveLength(2);
        }
    });

    it("should have Nil as a nullary-value constructor (not a function)", () => {
        const env = getBuiltinEnv();
        const nil = env.get("Nil");

        // Nullary constructors are values (List<T> here), not zero-arg
        // functions — see type-declarations.ts / builtins.ts.
        expect(nil?.type.type).toBe("App");
    });
});

describe("Option Constructor Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Some constructor", () => {
        const env = getBuiltinEnv();
        const some = env.get("Some");

        expect(some).toBeDefined();
        expect(some?.vars.length).toBeGreaterThan(0);
        expect(some?.type.type).toBe("Fun");
    });

    it("should have polymorphic None constructor", () => {
        const env = getBuiltinEnv();
        const none = env.get("None");

        expect(none).toBeDefined();
        expect(none?.vars.length).toBeGreaterThan(0);
        // None is a nullary value of type Option<T>, not a zero-arg function.
        expect(none?.type.type).toBe("App");
    });

    it("should have Some take one parameter", () => {
        const env = getBuiltinEnv();
        const some = env.get("Some");

        expect(some?.type.type).toBe("Fun");
        if (some?.type.type === "Fun") {
            expect(some.type.params).toHaveLength(1);
        }
    });

    it("should represent None as a nullary value (Option<T>, not Fun)", () => {
        const env = getBuiltinEnv();
        const none = env.get("None");

        // Nullary constructors are values, not zero-arg functions.
        expect(none?.type.type).toBe("App");
    });
});

describe("Result Constructor Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Ok constructor", () => {
        const env = getBuiltinEnv();
        const ok = env.get("Ok");

        expect(ok).toBeDefined();
        expect(ok?.vars.length).toBeGreaterThan(0);
        expect(ok?.type.type).toBe("Fun");
    });

    it("should have polymorphic Err constructor", () => {
        const env = getBuiltinEnv();
        const err = env.get("Err");

        expect(err).toBeDefined();
        expect(err?.vars.length).toBeGreaterThan(0);
        expect(err?.type.type).toBe("Fun");
    });

    it("should have Ok take one parameter", () => {
        const env = getBuiltinEnv();
        const ok = env.get("Ok");

        expect(ok?.type.type).toBe("Fun");
        if (ok?.type.type === "Fun") {
            expect(ok.type.params).toHaveLength(1);
        }
    });

    it("should have Err take one parameter", () => {
        const env = getBuiltinEnv();
        const err = env.get("Err");

        expect(err?.type.type).toBe("Fun");
        if (err?.type.type === "Fun") {
            expect(err.type.params).toHaveLength(1);
        }
    });
});

describe("Special Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic panic function", () => {
        const env = getBuiltinEnv();
        const panic = env.get("panic");

        expect(panic).toBeDefined();
        expect(panic?.vars).toHaveLength(0);
        expect(panic?.type.type).toBe("Fun");
    });

    it("should have panic return Never type", () => {
        const env = getBuiltinEnv();
        const panic = env.get("panic");

        expect(panic?.type.type).toBe("Fun");
        if (panic?.type.type === "Fun") {
            expect(panic.type.return).toEqual(primitiveTypes.Never);
        }
    });

    it("should have polymorphic ref function", () => {
        const env = getBuiltinEnv();
        const ref = env.get("ref");

        expect(ref).toBeDefined();
        expect(ref?.vars.length).toBeGreaterThan(0);
    });

    it("should have ref return Ref<T> type", () => {
        const env = getBuiltinEnv();
        const ref = env.get("ref");

        expect(ref?.type.type).toBe("Fun");
        if (ref?.type.type === "Fun") {
            const returnType = ref.type.return;
            expect(returnType.type).toBe("App");
            if (returnType.type === "App") {
                expect(returnType.constructor).toEqual({ type: "Const", name: "Ref" });
            }
        }
    });
});
