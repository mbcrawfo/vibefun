/**
 * Tests for desugarRecordTypeField function
 */

import type { RecordTypeField } from "../types/ast.js";
import type { CoreTypeExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugarRecordTypeField } from "./desugarRecordTypeField.js";

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

describe("desugarRecordTypeField", () => {
    it("should transform record type field", () => {
        const field: RecordTypeField = {
            name: "age",
            typeExpr: { kind: "TypeConst", name: "Int", loc: testLoc },
            loc: testLoc,
        };

        const result = desugarRecordTypeField(field, mockDesugarTypeExpr);

        expect(result.name).toBe("age");
        expect(result.typeExpr.kind).toBe("CoreTypeConst");
        if (result.typeExpr.kind === "CoreTypeConst") {
            expect(result.typeExpr.name).toBe("Int");
        }
        expect(result.loc).toBe(testLoc);
    });

    it("should preserve field name", () => {
        const field: RecordTypeField = {
            name: "username",
            typeExpr: { kind: "TypeConst", name: "String", loc: testLoc },
            loc: testLoc,
        };

        const result = desugarRecordTypeField(field, mockDesugarTypeExpr);

        expect(result.name).toBe("username");
    });
});
