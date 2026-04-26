import * as fc from "fast-check";
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

    describe("properties", () => {
        const finite = fc.double({ noNaN: true, noDefaultInfinity: true });
        const nonNeg = fc.double({ noNaN: true, noDefaultInfinity: true, min: 0 });
        const positive = fc.double({ noNaN: true, noDefaultInfinity: true, min: Number.MIN_VALUE });
        const angle = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 });

        it("property: sqrt(n*n) === abs(n) when n*n stays representable", () => {
            // Restrict to |n| <= 1e150 so n*n does not overflow to Infinity
            // (sqrt(MAX_VALUE) ~= 1.34e154; staying well below avoids precision loss).
            // Use relative-error tolerance: toBeCloseTo's absolute tolerance is
            // scale-blind and impossibly tight at large magnitudes.
            const safeForSquaring = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e150, max: 1e150 });
            fc.assert(
                fc.property(safeForSquaring, (n) => {
                    const expected = M.abs(n);
                    const actual = M.sqrt(n * n);
                    const relErr = Math.abs(actual - expected) / Math.max(1, expected);
                    expect(relErr).toBeLessThanOrEqual(1e-12);
                }),
            );
        });

        it("property: sqrt is monotonically non-decreasing on non-negative inputs", () => {
            fc.assert(
                fc.property(nonNeg, nonNeg, (a, b) => {
                    if (a <= b) expect(M.sqrt(a)).toBeLessThanOrEqual(M.sqrt(b));
                }),
            );
        });

        it("property: log(exp(n)) === n for finite n in safe range", () => {
            fc.assert(
                fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -50, max: 50 }), (n) => {
                    expect(M.log(M.exp(n))).toBeCloseTo(n, 8);
                }),
            );
        });

        it("property: pow(b, 0) === 1 for any non-zero finite base", () => {
            fc.assert(
                fc.property(
                    finite.filter((n) => n !== 0),
                    (b) => {
                        expect(M.pow(b)(0)).toBe(1);
                    },
                ),
            );
        });

        it("property: pow(b, 1) === b for any finite base", () => {
            fc.assert(
                fc.property(finite, (b) => {
                    expect(M.pow(b)(1)).toBe(b);
                }),
            );
        });

        it("property: sin^2 + cos^2 === 1 (Pythagorean identity)", () => {
            fc.assert(
                fc.property(angle, (n) => {
                    const s = M.sin(n);
                    const c = M.cos(n);
                    expect(s * s + c * c).toBeCloseTo(1, 10);
                }),
            );
        });

        it("property: sin and cos stay within [-1, 1]", () => {
            fc.assert(
                fc.property(angle, (n) => {
                    expect(M.sin(n)).toBeGreaterThanOrEqual(-1);
                    expect(M.sin(n)).toBeLessThanOrEqual(1);
                    expect(M.cos(n)).toBeGreaterThanOrEqual(-1);
                    expect(M.cos(n)).toBeLessThanOrEqual(1);
                }),
            );
        });

        it("property: abs is non-negative on finite floats", () => {
            fc.assert(
                fc.property(finite, (n) => {
                    expect(M.abs(n)).toBeGreaterThanOrEqual(0);
                }),
            );
        });

        it("property: sign returns -1, 0, or 1 for finite floats", () => {
            fc.assert(
                fc.property(finite, (n) => {
                    const s = M.sign(n);
                    expect(s === -1 || s === 0 || s === 1).toBe(true);
                }),
            );
        });

        it("property: min/max are commutative", () => {
            fc.assert(
                fc.property(finite, finite, (a, b) => {
                    expect(M.min(a)(b)).toBe(M.min(b)(a));
                    expect(M.max(a)(b)).toBe(M.max(b)(a));
                }),
            );
        });

        it("property: min(a,b) <= max(a,b) for finite floats", () => {
            fc.assert(
                fc.property(finite, finite, (a, b) => {
                    expect(M.min(a)(b)).toBeLessThanOrEqual(M.max(a)(b));
                }),
            );
        });

        it("property: log/log10/log2 agree up to base change on positive inputs", () => {
            fc.assert(
                fc.property(positive, (n) => {
                    expect(M.log10(n)).toBeCloseTo(M.log(n) / Math.log(10), 8);
                    expect(M.log2(n)).toBeCloseTo(M.log(n) / Math.log(2), 8);
                }),
            );
        });

        it("property: floor(n) <= n and ceil(n) >= n", () => {
            fc.assert(
                fc.property(finite, (n) => {
                    expect(M.floor(n)).toBeLessThanOrEqual(n);
                    expect(M.ceil(n)).toBeGreaterThanOrEqual(n);
                }),
            );
        });

        it("property: trunc(n) is between 0 and n inclusive", () => {
            fc.assert(
                fc.property(finite, (n) => {
                    const t = M.trunc(n);
                    if (n >= 0) {
                        expect(t).toBeGreaterThanOrEqual(0);
                        expect(t).toBeLessThanOrEqual(n);
                    } else {
                        expect(t).toBeLessThanOrEqual(0);
                        expect(t).toBeGreaterThanOrEqual(n);
                    }
                }),
            );
        });
    });
});
