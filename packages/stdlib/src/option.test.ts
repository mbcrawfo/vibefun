import type { Option } from "./variants.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import * as O from "./option.js";
import { optionArb } from "./test-arbitraries/index.js";
import { None, Some } from "./variants.js";

describe("Option", () => {
    it("map transforms Some", () => {
        expect(O.map(Some(5))((x) => x * 2)).toEqual(Some(10));
    });
    it("map passes None through", () => {
        expect(O.map<number, number>(None)((x) => x * 2)).toEqual(None);
    });
    it("flatMap chains Some", () => {
        expect(O.flatMap(Some(5))((x) => Some(x + 1))).toEqual(Some(6));
    });
    it("flatMap short-circuits on None", () => {
        expect(O.flatMap<number, number>(None)((x) => Some(x + 1))).toEqual(None);
    });
    it("getOrElse returns value or fallback", () => {
        expect(O.getOrElse(Some(42))(0)).toBe(42);
        expect(O.getOrElse<number>(None)(0)).toBe(0);
    });
    it("isSome / isNone discriminate", () => {
        expect(O.isSome(Some(1))).toBe(true);
        expect(O.isSome(None)).toBe(false);
        expect(O.isNone(Some(1))).toBe(false);
        expect(O.isNone(None)).toBe(true);
    });
    it("unwrap returns value on Some and throws on None", () => {
        expect(O.unwrap(Some(9))).toBe(9);
        expect(() => O.unwrap<number>(None)).toThrow(/unwrap called on None/);
    });

    describe("properties", () => {
        const intOpt: fc.Arbitrary<Option<number>> = optionArb(fc.integer());

        it("property: map(id) === id (functor identity)", () => {
            fc.assert(
                fc.property(intOpt, (opt) => {
                    expect(O.map(opt)((x: number) => x)).toEqual(opt);
                }),
            );
        });

        it("property: map(f ∘ g) === map(f) ∘ map(g) (functor composition)", () => {
            const f = (x: number): number => x * 3;
            const g = (x: number): number => x + 1;
            fc.assert(
                fc.property(intOpt, (opt) => {
                    expect(O.map(opt)((x: number) => f(g(x)))).toEqual(
                        O.map<number, number>(O.map<number, number>(opt)(g))(f),
                    );
                }),
            );
        });

        it("property: monad left identity — flatMap(Some(a))(k) === k(a)", () => {
            const k = (x: number): Option<number> => Some(x * 10);
            fc.assert(
                fc.property(fc.integer(), (a) => {
                    expect(O.flatMap(Some(a))(k)).toEqual(k(a));
                }),
            );
        });

        it("property: monad right identity — flatMap(opt)(Some) === opt", () => {
            fc.assert(
                fc.property(intOpt, (opt) => {
                    expect(O.flatMap(opt)(Some)).toEqual(opt);
                }),
            );
        });

        it("property: monad associativity — flatMap(flatMap(opt)(f))(g) === flatMap(opt)(x => flatMap(f(x))(g))", () => {
            const f = (x: number): Option<number> => (x % 2 === 0 ? Some(x / 2) : None);
            const g = (x: number): Option<number> => (x > 0 ? Some(x + 1) : None);
            fc.assert(
                fc.property(intOpt, (opt: Option<number>) => {
                    const lhs = O.flatMap<number, number>(O.flatMap<number, number>(opt)(f))(g);
                    const rhs = O.flatMap<number, number>(opt)((x: number) => O.flatMap<number, number>(f(x))(g));
                    expect(lhs).toEqual(rhs);
                }),
            );
        });

        it("property: getOrElse on None returns the fallback", () => {
            fc.assert(
                fc.property(fc.integer(), (fallback) => {
                    expect(O.getOrElse<number>(None)(fallback)).toBe(fallback);
                }),
            );
        });

        it("property: getOrElse on Some(a) returns a regardless of the fallback", () => {
            fc.assert(
                fc.property(fc.integer(), fc.integer(), (a, fallback) => {
                    expect(O.getOrElse(Some(a))(fallback)).toBe(a);
                }),
            );
        });

        it("property: isSome and isNone are mutually exclusive and exhaustive", () => {
            fc.assert(
                fc.property(intOpt, (opt) => {
                    expect(O.isSome(opt)).toBe(!O.isNone(opt));
                }),
            );
        });

        it("property: unwrap is the inverse of Some when isSome", () => {
            fc.assert(
                fc.property(fc.integer(), (a) => {
                    expect(O.unwrap(Some(a))).toBe(a);
                }),
            );
        });

        it("property: map preserves the Some/None tag", () => {
            fc.assert(
                fc.property(intOpt, (opt) => {
                    expect(O.map(opt)((x: number) => x).$tag).toBe(opt.$tag);
                }),
            );
        });
    });
});
