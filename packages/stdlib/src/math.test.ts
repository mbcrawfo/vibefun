import { describe, expect, it } from "vitest";

import * as M from "./math.js";

describe("Math", () => {
    it("sqrt", () => {
        expect(M.sqrt(16)).toBe(4);
        expect(M.sqrt(0)).toBe(0);
    });
    it("floor / ceil", () => {
        expect(M.floor(3.9)).toBe(3);
        expect(M.ceil(3.1)).toBe(4);
    });
    it("abs", () => {
        expect(M.abs(-2.5)).toBe(2.5);
        expect(M.abs(3.14)).toBe(3.14);
    });
    it("curried binary functions", () => {
        expect(M.pow(2)(3)).toBe(8);
        expect(M.pow(5)(0)).toBe(1);
        expect(M.atan2(0)(1)).toBe(0);
        expect(M.min(10)(4)).toBe(4);
        expect(M.min(-1)(1)).toBe(-1);
        expect(M.max(10)(4)).toBe(10);
        expect(M.max(-1)(1)).toBe(1);
    });
    it("constants match JS Math", () => {
        expect(M.pi).toBe(Math.PI);
        expect(M.e).toBe(Math.E);
    });
});
