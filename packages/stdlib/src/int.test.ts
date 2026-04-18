import { describe, expect, it } from "vitest";

import * as I from "./int.js";

describe("Int", () => {
    it("toString stringifies", () => {
        expect(I.toString(42)).toBe("42");
        expect(I.toString(-100)).toBe("-100");
        expect(I.toString(0)).toBe("0");
    });
    it("toFloat is identity", () => {
        expect(I.toFloat(42)).toBe(42);
    });
    it("abs returns magnitude", () => {
        expect(I.abs(42)).toBe(42);
        expect(I.abs(-42)).toBe(42);
        expect(I.abs(0)).toBe(0);
    });
    it("abs handles integers outside the 32-bit signed range", () => {
        // Guards against a prior `Math.abs(n) | 0` implementation that
        // truncated to signed 32-bit and wrapped values beyond ±2^31.
        expect(I.abs(3_000_000_000)).toBe(3_000_000_000);
        expect(I.abs(-3_000_000_000)).toBe(3_000_000_000);
        expect(I.abs(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    });
    it("max / min pick the larger/smaller", () => {
        expect(I.max(10)(20)).toBe(20);
        expect(I.max(5)(3)).toBe(5);
        expect(I.min(10)(20)).toBe(10);
        expect(I.min(-1)(-10)).toBe(-10);
    });
});
