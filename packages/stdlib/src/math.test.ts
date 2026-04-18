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
});
