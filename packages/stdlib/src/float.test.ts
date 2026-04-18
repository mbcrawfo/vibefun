import { describe, expect, it } from "vitest";

import * as F from "./float.js";

describe("Float", () => {
    it("toString drops trailing .0 on whole numbers", () => {
        expect(F.toString(3.14)).toBe("3.14");
        expect(F.toString(-2.5)).toBe("-2.5");
        expect(F.toString(1.0)).toBe("1");
    });
    it("toInt truncates toward zero", () => {
        expect(F.toInt(3.14)).toBe(3);
        expect(F.toInt(9.99)).toBe(9);
        expect(F.toInt(-2.7)).toBe(-2);
        expect(F.toInt(1.0)).toBe(1);
    });
    it("round rounds halfway cases away from zero", () => {
        expect(F.round(3.4)).toBe(3);
        expect(F.round(3.5)).toBe(4);
        expect(F.round(3.6)).toBe(4);
        expect(F.round(-2.5)).toBe(-3);
    });
    it("floor rounds toward -inf", () => {
        expect(F.floor(3.9)).toBe(3);
        expect(F.floor(-2.1)).toBe(-3);
        expect(F.floor(5.0)).toBe(5);
    });
    it("ceil rounds toward +inf", () => {
        expect(F.ceil(3.1)).toBe(4);
        expect(F.ceil(-2.9)).toBe(-2);
        expect(F.ceil(5.0)).toBe(5);
    });
    it("abs returns magnitude", () => {
        expect(F.abs(3.14)).toBe(3.14);
        expect(F.abs(-2.5)).toBe(2.5);
        expect(F.abs(0.0)).toBe(0.0);
    });
});
