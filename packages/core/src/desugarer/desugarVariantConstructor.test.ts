/**
 * Tests for desugarVariantConstructor function
 */

import type { VariantConstructor } from "../types/ast.js";
import type { CoreTypeExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugarVariantConstructor } from "./desugarVariantConstructor.js";

const testLoc = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Mock desugarTypeExpr function
const mockDesugarTypeExpr = (typeExpr: import("../types/ast.js").TypeExpr): CoreTypeExpr => {
    if (typeExpr.kind === "TypeConst") {
        return { kind: "CoreTypeConst", name: typeExpr.name, loc: typeExpr.loc };
    }
    throw new Error(`Unexpected type expression kind: ${typeExpr.kind}`);
};

describe("desugarVariantConstructor", () => {
    it("should transform variant constructor with no args", () => {
        const ctor: VariantConstructor = {
            name: "None",
            args: [],
            loc: testLoc,
        };

        const result = desugarVariantConstructor(ctor, mockDesugarTypeExpr);

        expect(result.name).toBe("None");
        expect(result.args).toHaveLength(0);
        expect(result.loc).toBe(testLoc);
    });

    it("should transform variant constructor with single arg", () => {
        const ctor: VariantConstructor = {
            name: "Some",
            args: [{ kind: "TypeConst", name: "Int", loc: testLoc }],
            loc: testLoc,
        };

        const result = desugarVariantConstructor(ctor, mockDesugarTypeExpr);

        expect(result.name).toBe("Some");
        expect(result.args).toHaveLength(1);
        expect(result.args[0]?.kind).toBe("CoreTypeConst");
        if (result.args[0]?.kind === "CoreTypeConst") {
            expect(result.args[0].name).toBe("Int");
        }
    });

    it("should transform variant constructor with multiple args", () => {
        const ctor: VariantConstructor = {
            name: "Pair",
            args: [
                { kind: "TypeConst", name: "Int", loc: testLoc },
                { kind: "TypeConst", name: "String", loc: testLoc },
            ],
            loc: testLoc,
        };

        const result = desugarVariantConstructor(ctor, mockDesugarTypeExpr);

        expect(result.name).toBe("Pair");
        expect(result.args).toHaveLength(2);
        expect(result.args[0]?.kind).toBe("CoreTypeConst");
        expect(result.args[1]?.kind).toBe("CoreTypeConst");
        if (result.args[0]?.kind === "CoreTypeConst") {
            expect(result.args[0].name).toBe("Int");
        }
        if (result.args[1]?.kind === "CoreTypeConst") {
            expect(result.args[1].name).toBe("String");
        }
    });
});
