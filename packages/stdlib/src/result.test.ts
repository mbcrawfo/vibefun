import type { Result } from "./variants.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import * as R from "./result.js";
import { resultArb } from "./test-arbitraries/index.js";
import { Err, Ok } from "./variants.js";

describe("Result", () => {
    it("map transforms Ok, leaves Err", () => {
        expect(R.map(Ok<number, string>(5))((x) => x * 2)).toEqual(Ok(10));
        expect(R.map(Err<number, string>("boom"))((x) => x * 2)).toEqual(Err("boom"));
    });
    it("flatMap chains Ok, short-circuits Err", () => {
        expect(R.flatMap(Ok<number, string>(5))((x) => Ok(x + 1))).toEqual(Ok(6));
        expect(R.flatMap(Err<number, string>("boom"))((x) => Ok(x + 1))).toEqual(Err("boom"));
    });
    it("mapErr transforms Err, leaves Ok", () => {
        expect(R.mapErr(Err<number, string>("bad"))((e) => e.toUpperCase())).toEqual(Err("BAD"));
        expect(R.mapErr(Ok<number, string>(5))((e) => e.toUpperCase())).toEqual(Ok(5));
    });
    it("isOk / isErr discriminate", () => {
        expect(R.isOk(Ok<number, string>(1))).toBe(true);
        expect(R.isOk(Err<number, string>("x"))).toBe(false);
        expect(R.isErr(Ok<number, string>(1))).toBe(false);
        expect(R.isErr(Err<number, string>("x"))).toBe(true);
    });
    it("unwrap returns value on Ok and throws on Err", () => {
        expect(R.unwrap(Ok<number, string>(9))).toBe(9);
        expect(() => R.unwrap(Err<number, string>("no"))).toThrow(/unwrap called on Err/);
    });
    it("unwrapOr returns value on Ok and fallback on Err", () => {
        expect(R.unwrapOr(Ok<number, string>(9))(0)).toBe(9);
        expect(R.unwrapOr(Err<number, string>("bad"))(0)).toBe(0);
    });

    describe("properties", () => {
        const intStrResult: fc.Arbitrary<Result<number, string>> = resultArb(fc.integer(), fc.string());

        it("property: map(id) === id (functor identity)", () => {
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    expect(R.map<number, string, number>(r)((x: number) => x)).toEqual(r);
                }),
            );
        });

        it("property: map(f ∘ g) === map(f) ∘ map(g) (functor composition)", () => {
            const f = (x: number): number => x * 2;
            const g = (x: number): number => x + 7;
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    const lhs = R.map<number, string, number>(r)((x: number) => f(g(x)));
                    const rhs = R.map<number, string, number>(R.map<number, string, number>(r)(g))(f);
                    expect(lhs).toEqual(rhs);
                }),
            );
        });

        it("property: monad left identity — flatMap(Ok(a))(k) === k(a)", () => {
            const k = (x: number): Result<number, string> => Ok(x + 100);
            fc.assert(
                fc.property(fc.integer(), (a) => {
                    expect(R.flatMap<number, string, number>(Ok<number, string>(a))(k)).toEqual(k(a));
                }),
            );
        });

        it("property: monad right identity — flatMap(r)(Ok) === r", () => {
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    expect(R.flatMap<number, string, number>(r)((x: number) => Ok<number, string>(x))).toEqual(r);
                }),
            );
        });

        it("property: monad associativity", () => {
            const f = (x: number): Result<number, string> => (x % 2 === 0 ? Ok(x / 2) : Err("odd"));
            const g = (x: number): Result<number, string> => (x > 0 ? Ok(x + 1) : Err("non-positive"));
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    const lhs = R.flatMap<number, string, number>(R.flatMap<number, string, number>(r)(f))(g);
                    const rhs = R.flatMap<number, string, number>(r)((x: number) =>
                        R.flatMap<number, string, number>(f(x))(g),
                    );
                    expect(lhs).toEqual(rhs);
                }),
            );
        });

        it("property: mapErr(id) === id", () => {
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    expect(R.mapErr<number, string, string>(r)((e: string) => e)).toEqual(r);
                }),
            );
        });

        it("property: map only touches Ok and mapErr only touches Err", () => {
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    const mapped = R.map<number, string, number>(r)((x: number) => x + 1);
                    const mappedErr = R.mapErr<number, string, string>(r)((e: string) => e + "!");
                    if (r.$tag === "Ok") {
                        expect(mappedErr).toEqual(r);
                        expect(mapped.$tag).toBe("Ok");
                    } else {
                        expect(mapped).toEqual(r);
                        expect(mappedErr.$tag).toBe("Err");
                    }
                }),
            );
        });

        it("property: isOk and isErr are exhaustive and exclusive", () => {
            fc.assert(
                fc.property(intStrResult, (r: Result<number, string>) => {
                    expect(R.isOk(r)).toBe(!R.isErr(r));
                }),
            );
        });

        it("property: unwrap inverts Ok", () => {
            fc.assert(
                fc.property(fc.integer(), (a) => {
                    expect(R.unwrap(Ok<number, string>(a))).toBe(a);
                }),
            );
        });

        it("property: unwrapOr returns value on Ok and fallback on Err", () => {
            fc.assert(
                fc.property(intStrResult, fc.integer(), (r: Result<number, string>, fallback: number) => {
                    if (r.$tag === "Ok") expect(R.unwrapOr<number, string>(r)(fallback)).toBe(r.$0);
                    else expect(R.unwrapOr<number, string>(r)(fallback)).toBe(fallback);
                }),
            );
        });
    });
});
