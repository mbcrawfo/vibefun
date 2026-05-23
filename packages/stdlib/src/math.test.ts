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

    it("sin / cos / tan at canonical angles", () => {
        // ECMAScript mandates exact results for sin(0), cos(0), tan(0).
        expect(M.sin(0)).toBe(0);
        expect(M.sin(M.pi / 2)).toBeCloseTo(1, 10);
        expect(M.cos(0)).toBe(1);
        expect(M.cos(M.pi)).toBeCloseTo(-1, 10);
        expect(M.tan(0)).toBe(0);
    });

    it("atan2 returns the correct angle per quadrant", () => {
        // atan2(y)(x) follows the math convention atan2(y, x).
        expect(M.atan2(0)(1)).toBe(0); // +x axis
        expect(M.atan2(1)(0)).toBeCloseTo(Math.PI / 2, 10); // +y axis
        expect(M.atan2(0)(-1)).toBeCloseTo(Math.PI, 10); // -x axis
        expect(M.atan2(-1)(0)).toBeCloseTo(-Math.PI / 2, 10); // -y axis
    });

    it("exp / log / log10 / log2 at canonical points", () => {
        // ECMAScript mandates exact results for exp(0), log(1), log10(1), log2(1).
        expect(M.exp(0)).toBe(1);
        expect(M.exp(1)).toBeCloseTo(M.e, 10);
        expect(M.log(1)).toBe(0);
        expect(M.log(M.e)).toBeCloseTo(1, 10);
        expect(M.log10(1)).toBe(0);
        expect(M.log10(100)).toBeCloseTo(2, 10);
        expect(M.log2(1)).toBe(0);
        expect(M.log2(8)).toBeCloseTo(3, 10);
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

        it("property: tan(x) === sin(x) / cos(x) away from the asymptotes", () => {
            // Restrict to (-π/4, π/4): cos(x) stays >= ~0.707, so the quotient is
            // well-conditioned and matches the dedicated tan implementation.
            const nearZero = fc.double({ noNaN: true, noDefaultInfinity: true, min: -0.7, max: 0.7 });
            fc.assert(
                fc.property(nearZero, (x) => {
                    expect(M.tan(x)).toBeCloseTo(M.sin(x) / M.cos(x), 10);
                }),
            );
        });

        it("property: asin(sin(x)) === x on [-π/2, π/2] (with endpoint margin)", () => {
            // asin's derivative diverges at ±1, so leave a small margin off ±π/2 to
            // keep the round-trip well-conditioned.
            const inRange = fc.double({
                noNaN: true,
                noDefaultInfinity: true,
                min: -Math.PI / 2 + 0.01,
                max: Math.PI / 2 - 0.01,
            });
            fc.assert(
                fc.property(inRange, (x) => {
                    expect(M.asin(M.sin(x))).toBeCloseTo(x, 9);
                }),
            );
        });

        it("property: acos(cos(x)) === x on [0, π] (with endpoint margin)", () => {
            // acos's derivative diverges at ±1 (i.e. x near 0 and π); same margin rationale.
            const inRange = fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.01, max: Math.PI - 0.01 });
            fc.assert(
                fc.property(inRange, (x) => {
                    expect(M.acos(M.cos(x))).toBeCloseTo(x, 9);
                }),
            );
        });

        it("property: atan(tan(x)) === x on (-π/2, π/2) (with endpoint margin)", () => {
            // tan diverges near ±π/2; a 0.1 margin keeps the forward map finite.
            const inRange = fc.double({
                noNaN: true,
                noDefaultInfinity: true,
                min: -Math.PI / 2 + 0.1,
                max: Math.PI / 2 - 0.1,
            });
            fc.assert(
                fc.property(inRange, (x) => {
                    expect(M.atan(M.tan(x))).toBeCloseTo(x, 9);
                }),
            );
        });

        it("property: atan2(sin θ, cos θ) === θ on (-π, π)", () => {
            // Stay off the ±π branch cut where atan2 wraps.
            const theta = fc.double({
                noNaN: true,
                noDefaultInfinity: true,
                min: -Math.PI + 0.01,
                max: Math.PI - 0.01,
            });
            fc.assert(
                fc.property(theta, (t) => {
                    expect(M.atan2(M.sin(t))(M.cos(t))).toBeCloseTo(t, 10);
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
