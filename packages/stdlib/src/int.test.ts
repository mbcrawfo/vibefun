import * as fc from "fast-check";
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

    describe("properties", () => {
        it("property: abs is non-negative for any safe integer", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(I.abs(n)).toBeGreaterThanOrEqual(0);
                }),
            );
        });

        it("property: abs is idempotent", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(I.abs(I.abs(n))).toBe(I.abs(n));
                }),
            );
        });

        it("property: abs(n) === abs(-n)", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    // -Number.MIN_SAFE_INTEGER stays in safe range; -MAX_SAFE_INTEGER does too.
                    expect(I.abs(n)).toBe(I.abs(-n));
                }),
            );
        });

        it("property: toString round-trips through Number for safe integers", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(Number(I.toString(n))).toBe(n);
                }),
            );
        });

        it("property: toFloat is identity for any safe integer", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(I.toFloat(n)).toBe(n);
                }),
            );
        });

        it("property: max is commutative", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), fc.maxSafeInteger(), (a, b) => {
                    expect(I.max(a)(b)).toBe(I.max(b)(a));
                }),
            );
        });

        it("property: max(a,b) >= a and >= b", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), fc.maxSafeInteger(), (a, b) => {
                    const m = I.max(a)(b);
                    expect(m).toBeGreaterThanOrEqual(a);
                    expect(m).toBeGreaterThanOrEqual(b);
                }),
            );
        });

        it("property: min is commutative", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), fc.maxSafeInteger(), (a, b) => {
                    expect(I.min(a)(b)).toBe(I.min(b)(a));
                }),
            );
        });

        it("property: min(a,b) <= a and <= b", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), fc.maxSafeInteger(), (a, b) => {
                    const m = I.min(a)(b);
                    expect(m).toBeLessThanOrEqual(a);
                    expect(m).toBeLessThanOrEqual(b);
                }),
            );
        });

        it("property: min(a,b) <= max(a,b)", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), fc.maxSafeInteger(), (a, b) => {
                    expect(I.min(a)(b)).toBeLessThanOrEqual(I.max(a)(b));
                }),
            );
        });
    });
});
