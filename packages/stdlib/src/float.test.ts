import * as fc from "fast-check";
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

    describe("properties", () => {
        const finiteFloat = fc.double({ noNaN: true, noDefaultInfinity: true });

        it("property: abs is non-negative on finite floats", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    expect(F.abs(n)).toBeGreaterThanOrEqual(0);
                }),
            );
        });

        it("property: abs is idempotent on finite floats", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    expect(F.abs(F.abs(n))).toBe(F.abs(n));
                }),
            );
        });

        it("property: floor(n) <= n <= ceil(n) for finite floats", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    expect(F.floor(n)).toBeLessThanOrEqual(n);
                    expect(F.ceil(n)).toBeGreaterThanOrEqual(n);
                }),
            );
        });

        it("property: ceil(n) - floor(n) is 0 (integer) or 1 (non-integer) for finite floats", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    const diff = F.ceil(n) - F.floor(n);
                    expect(diff === 0 || diff === 1).toBe(true);
                }),
            );
        });

        it("property: floor and ceil are idempotent", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    expect(F.floor(F.floor(n))).toBe(F.floor(n));
                    expect(F.ceil(F.ceil(n))).toBe(F.ceil(n));
                }),
            );
        });

        it("property: toInt truncates toward zero", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    const t = F.toInt(n);
                    if (n >= 0) {
                        expect(t).toBeLessThanOrEqual(n);
                        expect(t).toBeGreaterThanOrEqual(F.floor(n));
                    } else {
                        expect(t).toBeGreaterThanOrEqual(n);
                        expect(t).toBeLessThanOrEqual(F.ceil(n));
                    }
                }),
            );
        });

        it("property: round respects round-half-away-from-zero direction", () => {
            fc.assert(
                fc.property(finiteFloat, (n) => {
                    const r = F.round(n);
                    expect(Math.abs(r - n)).toBeLessThanOrEqual(0.5 + Number.EPSILON);
                    if (n >= 0) expect(r).toBeGreaterThanOrEqual(0);
                    else expect(r).toBeLessThanOrEqual(0);
                }),
            );
        });

        it("property: isNaN, isInfinite, isFinite are mutually exclusive and exhaustive", () => {
            fc.assert(
                fc.property(fc.double(), (n) => {
                    const flags = [F.isNaN(n), F.isInfinite(n), F.isFinite(n)];
                    expect(flags.filter((f) => f).length).toBe(1);
                }),
            );
        });

        it("property: toString does not throw on any double", () => {
            fc.assert(
                fc.property(fc.double(), (n) => {
                    expect(typeof F.toString(n)).toBe("string");
                }),
            );
        });

        it("property: toString drops trailing .0 on integer-valued finite floats", () => {
            fc.assert(
                fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (n) => {
                    expect(F.toString(n)).toBe(String(n));
                }),
            );
        });
    });
});
