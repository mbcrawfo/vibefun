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
    it("overflow past MAX_SAFE_INTEGER loses precision but never panics (spec 09-error-handling F-18)", () => {
        // docs/spec/09-error-handling.md §36-44: integers are JS doubles, so
        // arithmetic above 2^53-1 silently loses precision rather than panicking.
        const maxSafe = Number.MAX_SAFE_INTEGER; // 9007199254740991 (2^53 - 1)
        expect(I.toString(maxSafe)).toBe("9007199254740991");
        // maxSafe + 1 is still exactly representable...
        expect(maxSafe + 1).toBe(9007199254740992);
        // ...but maxSafe + 2 collides with maxSafe + 1 — the odd value 2^53+1
        // is not representable, so precision is lost (spec's exact example).
        expect(maxSafe + 2).toBe(9007199254740992);
        // No exception is thrown at any point — stringifying the lossy value works.
        expect(() => I.toString(maxSafe + 2)).not.toThrow();
        expect(I.toString(maxSafe + 2)).toBe("9007199254740992");
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

        it("property: across the safe-integer boundary, toString/arithmetic stay finite and never panic (spec 09 F-18)", () => {
            // Sweep from just below 2^52 up past 2^53 (the safe-integer ceiling
            // is 2^53-1). The contract is "silent precision loss, no panic":
            // every value stringifies and adds without throwing or going
            // non-finite. Within the safe range the representation is exact and
            // round-trips; above it, precision may be lost but the program lives.
            fc.assert(
                fc.property(fc.bigInt({ min: 2n ** 52n, max: 2n ** 53n + 100n }), (big) => {
                    const n = Number(big); // lossy above 2^53-1 — that is the behaviour under test
                    const s = I.toString(n);
                    expect(Number.isFinite(Number(s))).toBe(true);
                    // Arithmetic on the (possibly lossy) value does not crash or overflow to ±Infinity.
                    expect(Number.isFinite(n + 1)).toBe(true);
                    if (Number.isSafeInteger(n)) {
                        // Safe range: exact representation, so toString round-trips.
                        expect(Number(s)).toBe(n);
                    }
                }),
            );
        });

        it("property: across the negative safe-integer boundary, toString/arithmetic stay finite and never panic (spec 09 F-18)", () => {
            // Symmetric sweep on the MIN_SAFE_INTEGER side (-(2^53-1)); the spec
            // calls out both boundaries. Same contract: silent precision loss
            // below -(2^53-1), but no panic and never non-finite.
            fc.assert(
                fc.property(fc.bigInt({ min: -(2n ** 53n + 100n), max: -(2n ** 52n) }), (big) => {
                    const n = Number(big); // lossy below -(2^53-1) — the behaviour under test
                    const s = I.toString(n);
                    expect(Number.isFinite(Number(s))).toBe(true);
                    // Arithmetic on the (possibly lossy) value does not crash or overflow to ±Infinity.
                    expect(Number.isFinite(n - 1)).toBe(true);
                    if (Number.isSafeInteger(n)) {
                        // Safe range: exact representation, so toString round-trips.
                        expect(Number(s)).toBe(n);
                    }
                }),
            );
        });
    });
});
