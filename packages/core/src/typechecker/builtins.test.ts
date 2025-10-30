/**
 * Tests for built-in types and standard library functions
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

    it("should include List functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("List.map")).toBe(true);
        expect(env.has("List.filter")).toBe(true);
        expect(env.has("List.fold")).toBe(true);
        expect(env.has("List.length")).toBe(true);
    });

    it("should include Option functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("Option.map")).toBe(true);
        expect(env.has("Option.flatMap")).toBe(true);
        expect(env.has("Option.getOrElse")).toBe(true);
    });

    it("should include Result functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("Result.map")).toBe(true);
        expect(env.has("Result.flatMap")).toBe(true);
        expect(env.has("Result.isOk")).toBe(true);
    });

    it("should include String functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("String.length")).toBe(true);
        expect(env.has("String.concat")).toBe(true);
        expect(env.has("String.fromInt")).toBe(true);
    });

    it("should include Int functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("Int.toString")).toBe(true);
        expect(env.has("Int.toFloat")).toBe(true);
    });

    it("should include Float functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("Float.toString")).toBe(true);
        expect(env.has("Float.toInt")).toBe(true);
    });

    it("should include special functions", () => {
        const env = getBuiltinEnv();

        expect(env.has("panic")).toBe(true);
        expect(env.has("ref")).toBe(true);
    });

    it("should have exactly 54 built-in values", () => {
        const env = getBuiltinEnv();
        // 6 constructors + 46 stdlib functions (17 core + 29 Phase 7) + 2 special functions = 54
        expect(env.size).toBe(54);
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
        expect(cons?.vars.length).toBeGreaterThan(0); // Polymorphic
        expect(cons?.type.type).toBe("Fun");
    });

    it("should have polymorphic Nil constructor", () => {
        const env = getBuiltinEnv();
        const nil = env.get("Nil");

        expect(nil).toBeDefined();
        expect(nil?.vars.length).toBeGreaterThan(0); // Polymorphic
        expect(nil?.type.type).toBe("Fun");
    });

    it("should have Cons take two parameters", () => {
        const env = getBuiltinEnv();
        const cons = env.get("Cons");

        expect(cons?.type.type).toBe("Fun");
        if (cons?.type.type === "Fun") {
            expect(cons.type.params).toHaveLength(2);
        }
    });

    it("should have Nil take no parameters", () => {
        const env = getBuiltinEnv();
        const nil = env.get("Nil");

        expect(nil?.type.type).toBe("Fun");
        if (nil?.type.type === "Fun") {
            expect(nil.type.params).toHaveLength(0);
        }
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
        expect(none?.type.type).toBe("Fun");
    });

    it("should have Some take one parameter", () => {
        const env = getBuiltinEnv();
        const some = env.get("Some");

        expect(some?.type.type).toBe("Fun");
        if (some?.type.type === "Fun") {
            expect(some.type.params).toHaveLength(1);
        }
    });

    it("should have None take no parameters", () => {
        const env = getBuiltinEnv();
        const none = env.get("None");

        expect(none?.type.type).toBe("Fun");
        if (none?.type.type === "Fun") {
            expect(none.type.params).toHaveLength(0);
        }
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

describe("List Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic List.map", () => {
        const env = getBuiltinEnv();
        const map = env.get("List.map");

        expect(map).toBeDefined();
        expect(map?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.filter", () => {
        const env = getBuiltinEnv();
        const filter = env.get("List.filter");

        expect(filter).toBeDefined();
        expect(filter?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.fold", () => {
        const env = getBuiltinEnv();
        const fold = env.get("List.fold");

        expect(fold).toBeDefined();
        expect(fold?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.length", () => {
        const env = getBuiltinEnv();
        const length = env.get("List.length");

        expect(length).toBeDefined();
        expect(length?.vars.length).toBeGreaterThan(0);
    });
});

describe("Option Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Option.map", () => {
        const env = getBuiltinEnv();
        const map = env.get("Option.map");

        expect(map).toBeDefined();
        expect(map?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Option.flatMap", () => {
        const env = getBuiltinEnv();
        const flatMap = env.get("Option.flatMap");

        expect(flatMap).toBeDefined();
        expect(flatMap?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Option.getOrElse", () => {
        const env = getBuiltinEnv();
        const getOrElse = env.get("Option.getOrElse");

        expect(getOrElse).toBeDefined();
        expect(getOrElse?.vars.length).toBeGreaterThan(0);
    });
});

describe("Result Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Result.map", () => {
        const env = getBuiltinEnv();
        const map = env.get("Result.map");

        expect(map).toBeDefined();
        expect(map?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Result.flatMap", () => {
        const env = getBuiltinEnv();
        const flatMap = env.get("Result.flatMap");

        expect(flatMap).toBeDefined();
        expect(flatMap?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Result.isOk", () => {
        const env = getBuiltinEnv();
        const isOk = env.get("Result.isOk");

        expect(isOk).toBeDefined();
        expect(isOk?.vars.length).toBeGreaterThan(0);
    });
});

describe("String Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic String.length", () => {
        const env = getBuiltinEnv();
        const length = env.get("String.length");

        expect(length).toBeDefined();
        expect(length?.vars).toHaveLength(0); // Monomorphic
        expect(length?.type.type).toBe("Fun");
    });

    it("should have monomorphic String.concat", () => {
        const env = getBuiltinEnv();
        const concat = env.get("String.concat");

        expect(concat).toBeDefined();
        expect(concat?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.fromInt", () => {
        const env = getBuiltinEnv();
        const fromInt = env.get("String.fromInt");

        expect(fromInt).toBeDefined();
        expect(fromInt?.vars).toHaveLength(0);
    });
});

describe("Int Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic Int.toString", () => {
        const env = getBuiltinEnv();
        const toString = env.get("Int.toString");

        expect(toString).toBeDefined();
        expect(toString?.vars).toHaveLength(0);
    });

    it("should have monomorphic Int.toFloat", () => {
        const env = getBuiltinEnv();
        const toFloat = env.get("Int.toFloat");

        expect(toFloat).toBeDefined();
        expect(toFloat?.vars).toHaveLength(0);
    });
});

describe("Float Function Types", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic Float.toString", () => {
        const env = getBuiltinEnv();
        const toString = env.get("Float.toString");

        expect(toString).toBeDefined();
        expect(toString?.vars).toHaveLength(0);
    });

    it("should have monomorphic Float.toInt", () => {
        const env = getBuiltinEnv();
        const toInt = env.get("Float.toInt");

        expect(toInt).toBeDefined();
        expect(toInt?.vars).toHaveLength(0);
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

// ==================== Phase 7: Additional Standard Library Functions Tests ====================

describe("Phase 7 List Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic List.foldRight", () => {
        const env = getBuiltinEnv();
        const foldRight = env.get("List.foldRight");

        expect(foldRight).toBeDefined();
        expect(foldRight?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.head", () => {
        const env = getBuiltinEnv();
        const head = env.get("List.head");

        expect(head).toBeDefined();
        expect(head?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.tail", () => {
        const env = getBuiltinEnv();
        const tail = env.get("List.tail");

        expect(tail).toBeDefined();
        expect(tail?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.reverse", () => {
        const env = getBuiltinEnv();
        const reverse = env.get("List.reverse");

        expect(reverse).toBeDefined();
        expect(reverse?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic List.concat", () => {
        const env = getBuiltinEnv();
        const concat = env.get("List.concat");

        expect(concat).toBeDefined();
        expect(concat?.vars.length).toBeGreaterThan(0);
    });
});

describe("Phase 7 Option Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Option.isSome", () => {
        const env = getBuiltinEnv();
        const isSome = env.get("Option.isSome");

        expect(isSome).toBeDefined();
        expect(isSome?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Option.isNone", () => {
        const env = getBuiltinEnv();
        const isNone = env.get("Option.isNone");

        expect(isNone).toBeDefined();
        expect(isNone?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Option.unwrap", () => {
        const env = getBuiltinEnv();
        const unwrap = env.get("Option.unwrap");

        expect(unwrap).toBeDefined();
        expect(unwrap?.vars.length).toBeGreaterThan(0);
    });
});

describe("Phase 7 Result Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have polymorphic Result.mapErr", () => {
        const env = getBuiltinEnv();
        const mapErr = env.get("Result.mapErr");

        expect(mapErr).toBeDefined();
        expect(mapErr?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Result.isErr", () => {
        const env = getBuiltinEnv();
        const isErr = env.get("Result.isErr");

        expect(isErr).toBeDefined();
        expect(isErr?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Result.unwrap", () => {
        const env = getBuiltinEnv();
        const unwrap = env.get("Result.unwrap");

        expect(unwrap).toBeDefined();
        expect(unwrap?.vars.length).toBeGreaterThan(0);
    });

    it("should have polymorphic Result.unwrapOr", () => {
        const env = getBuiltinEnv();
        const unwrapOr = env.get("Result.unwrapOr");

        expect(unwrapOr).toBeDefined();
        expect(unwrapOr?.vars.length).toBeGreaterThan(0);
    });
});

describe("Phase 7 String Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic String.toUpperCase", () => {
        const env = getBuiltinEnv();
        const toUpperCase = env.get("String.toUpperCase");

        expect(toUpperCase).toBeDefined();
        expect(toUpperCase?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.toLowerCase", () => {
        const env = getBuiltinEnv();
        const toLowerCase = env.get("String.toLowerCase");

        expect(toLowerCase).toBeDefined();
        expect(toLowerCase?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.trim", () => {
        const env = getBuiltinEnv();
        const trim = env.get("String.trim");

        expect(trim).toBeDefined();
        expect(trim?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.split", () => {
        const env = getBuiltinEnv();
        const split = env.get("String.split");

        expect(split).toBeDefined();
        expect(split?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.contains", () => {
        const env = getBuiltinEnv();
        const contains = env.get("String.contains");

        expect(contains).toBeDefined();
        expect(contains?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.startsWith", () => {
        const env = getBuiltinEnv();
        const startsWith = env.get("String.startsWith");

        expect(startsWith).toBeDefined();
        expect(startsWith?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.endsWith", () => {
        const env = getBuiltinEnv();
        const endsWith = env.get("String.endsWith");

        expect(endsWith).toBeDefined();
        expect(endsWith?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.fromFloat", () => {
        const env = getBuiltinEnv();
        const fromFloat = env.get("String.fromFloat");

        expect(fromFloat).toBeDefined();
        expect(fromFloat?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.toInt", () => {
        const env = getBuiltinEnv();
        const toInt = env.get("String.toInt");

        expect(toInt).toBeDefined();
        expect(toInt?.vars).toHaveLength(0);
    });

    it("should have monomorphic String.toFloat", () => {
        const env = getBuiltinEnv();
        const toFloat = env.get("String.toFloat");

        expect(toFloat).toBeDefined();
        expect(toFloat?.vars).toHaveLength(0);
    });
});

describe("Phase 7 Int Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic Int.abs", () => {
        const env = getBuiltinEnv();
        const abs = env.get("Int.abs");

        expect(abs).toBeDefined();
        expect(abs?.vars).toHaveLength(0);
    });

    it("should have monomorphic Int.max", () => {
        const env = getBuiltinEnv();
        const max = env.get("Int.max");

        expect(max).toBeDefined();
        expect(max?.vars).toHaveLength(0);
    });

    it("should have monomorphic Int.min", () => {
        const env = getBuiltinEnv();
        const min = env.get("Int.min");

        expect(min).toBeDefined();
        expect(min?.vars).toHaveLength(0);
    });
});

describe("Phase 7 Float Functions", () => {
    beforeEach(() => {
        resetTypeVarCounter();
    });

    it("should have monomorphic Float.round", () => {
        const env = getBuiltinEnv();
        const round = env.get("Float.round");

        expect(round).toBeDefined();
        expect(round?.vars).toHaveLength(0);
    });

    it("should have monomorphic Float.floor", () => {
        const env = getBuiltinEnv();
        const floor = env.get("Float.floor");

        expect(floor).toBeDefined();
        expect(floor?.vars).toHaveLength(0);
    });

    it("should have monomorphic Float.ceil", () => {
        const env = getBuiltinEnv();
        const ceil = env.get("Float.ceil");

        expect(ceil).toBeDefined();
        expect(ceil?.vars).toHaveLength(0);
    });

    it("should have monomorphic Float.abs", () => {
        const env = getBuiltinEnv();
        const abs = env.get("Float.abs");

        expect(abs).toBeDefined();
        expect(abs?.vars).toHaveLength(0);
    });
});
