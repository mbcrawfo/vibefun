import type { List } from "./variants.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import * as L from "./list.js";
import { listArb, listToArray } from "./test-arbitraries/index.js";
import { Cons, Nil, None, Some } from "./variants.js";

const fromArray = <A>(arr: A[]): List<A> => {
    let result: List<A> = Nil;
    for (let i = arr.length - 1; i >= 0; i--) result = Cons(arr[i] as A)(result);
    return result;
};

const toArray = <A>(list: List<A>): A[] => {
    const out: A[] = [];
    let cur: List<A> = list;
    while (cur.$tag === "Cons") {
        out.push(cur.$0);
        cur = cur.$1;
    }
    return out;
};

describe("List", () => {
    describe("map", () => {
        it("transforms each element", () => {
            expect(toArray(L.map(fromArray([1, 2, 3]))((x) => x * 2))).toEqual([2, 4, 6]);
        });
        it("empty list stays empty", () => {
            expect(toArray(L.map(Nil)((x) => x * 2))).toEqual([]);
        });
    });

    describe("filter", () => {
        it("keeps matching elements in order", () => {
            expect(toArray(L.filter(fromArray([1, 2, 3, 4, 5]))((x) => x % 2 === 0))).toEqual([2, 4]);
        });
        it("returns empty when no match", () => {
            expect(toArray(L.filter(fromArray([1, 3, 5]))((x) => x % 2 === 0))).toEqual([]);
        });
    });

    describe("fold", () => {
        it("left-folds with data-first curried shape", () => {
            const sum = L.fold<number, number>(fromArray([1, 2, 3, 4]))(0)((acc) => (x) => acc + x);
            expect(sum).toBe(10);
        });
        it("returns init for empty list", () => {
            expect(L.fold<number, number>(Nil)(99)((acc) => (x) => acc + x)).toBe(99);
        });
    });

    describe("foldRight", () => {
        it("preserves order when rebuilding", () => {
            const rebuilt = L.foldRight<number, List<number>>(fromArray([1, 2, 3]))(Nil)((x) => (acc) => Cons(x)(acc));
            expect(toArray(rebuilt)).toEqual([1, 2, 3]);
        });
        it("subtraction demonstrates right-to-left order", () => {
            expect(L.foldRight<number, number>(fromArray([1, 2, 3]))(0)((x) => (acc) => x - acc)).toBe(2);
        });
    });

    describe("length", () => {
        it("counts elements", () => {
            expect(L.length(fromArray([1, 2, 3]))).toBe(3);
            expect(L.length(Nil)).toBe(0);
        });
    });

    describe("head/tail", () => {
        it("head returns Some for non-empty, None for empty", () => {
            expect(L.head(fromArray([1, 2, 3]))).toEqual(Some(1));
            expect(L.head(Nil)).toEqual(None);
        });
        it("tail returns Some(rest) for non-empty, None for empty", () => {
            const got = L.tail(fromArray([1, 2, 3]));
            expect(got.$tag).toBe("Some");
            if (got.$tag === "Some") expect(toArray(got.$0)).toEqual([2, 3]);
            expect(L.tail(Nil)).toEqual(None);
        });
    });

    describe("reverse", () => {
        it("reverses elements", () => {
            expect(toArray(L.reverse(fromArray([1, 2, 3])))).toEqual([3, 2, 1]);
            expect(toArray(L.reverse(Nil))).toEqual([]);
        });
    });

    describe("concat", () => {
        it("joins two lists preserving order", () => {
            expect(toArray(L.concat(fromArray([1, 2]))(fromArray([3, 4])))).toEqual([1, 2, 3, 4]);
        });
        it("handles empty operands", () => {
            expect(toArray(L.concat<number>(Nil)(fromArray([1, 2])))).toEqual([1, 2]);
            expect(toArray(L.concat(fromArray([1, 2]))(Nil as List<number>))).toEqual([1, 2]);
        });
    });

    describe("properties", () => {
        const intList: fc.Arbitrary<List<number>> = listArb(fc.integer());
        const intListIntList = fc.tuple(intList, intList);

        it("property: map(id) === id (functor identity)", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const id = <T>(x: T): T => x;
                    expect(listToArray(L.map(xs)(id))).toEqual(listToArray(xs));
                }),
            );
        });

        it("property: map(f ∘ g) === map(f) ∘ map(g) (functor composition)", () => {
            const f = (x: number): number => x * 2;
            const g = (x: number): number => x + 1;
            fc.assert(
                fc.property(intList, (xs: List<number>) => {
                    const lhs = listToArray(L.map(xs)((x: number) => f(g(x))));
                    const rhs = listToArray(L.map<number, number>(L.map<number, number>(xs)(g))(f));
                    expect(lhs).toEqual(rhs);
                }),
            );
        });

        it("property: filter(_ => true) === id; filter(_ => false) === Nil", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    expect(listToArray(L.filter(xs)(() => true))).toEqual(listToArray(xs));
                    expect(listToArray(L.filter(xs)(() => false))).toEqual([]);
                }),
            );
        });

        it("property: filter is idempotent for the same predicate", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const pred = (n: number): boolean => n >= 0;
                    const once = L.filter(xs)(pred);
                    const twice = L.filter(once)(pred);
                    expect(listToArray(twice)).toEqual(listToArray(once));
                }),
            );
        });

        it("property: length(reverse(xs)) === length(xs)", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    expect(L.length(L.reverse(xs))).toBe(L.length(xs));
                }),
            );
        });

        it("property: reverse is involutive", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    expect(listToArray(L.reverse(L.reverse(xs)))).toEqual(listToArray(xs));
                }),
            );
        });

        it("property: length matches array round-trip", () => {
            fc.assert(
                fc.property(fc.array(fc.integer()), (arr) => {
                    expect(L.length(fromArray(arr))).toBe(arr.length);
                }),
            );
        });

        it("property: concat is associative", () => {
            fc.assert(
                fc.property(intList, intList, intList, (a, b, c) => {
                    const lhs = listToArray(L.concat(L.concat(a)(b))(c));
                    const rhs = listToArray(L.concat(a)(L.concat(b)(c)));
                    expect(lhs).toEqual(rhs);
                }),
            );
        });

        it("property: Nil is the left and right identity for concat", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    expect(listToArray(L.concat<number>(Nil)(xs))).toEqual(listToArray(xs));
                    expect(listToArray(L.concat(xs)(Nil as List<number>))).toEqual(listToArray(xs));
                }),
            );
        });

        it("property: length is additive over concat", () => {
            fc.assert(
                fc.property(intListIntList, ([a, b]) => {
                    expect(L.length(L.concat(a)(b))).toBe(L.length(a) + L.length(b));
                }),
            );
        });

        it("property: head(reverse) returns the last element wrapped in Some, or None on empty", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const arr = listToArray(xs);
                    if (arr.length === 0) {
                        expect(L.head(L.reverse(xs))).toEqual(None);
                    } else {
                        expect(L.head(L.reverse(xs))).toEqual(Some(arr[arr.length - 1]));
                    }
                }),
            );
        });

        it("property: head/tail consistency: when head is Some, Cons(head, tail) reconstructs xs", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const h = L.head(xs);
                    const t = L.tail(xs);
                    if (h.$tag === "Some" && t.$tag === "Some") {
                        expect(listToArray(Cons(h.$0)(t.$0))).toEqual(listToArray(xs));
                    } else {
                        expect(h.$tag).toBe("None");
                        expect(t.$tag).toBe("None");
                    }
                }),
            );
        });

        it("property: foldRight with Cons/Nil rebuilds the original list", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const rebuilt = L.foldRight<number, List<number>>(xs)(Nil)((x) => (acc) => Cons(x)(acc));
                    expect(listToArray(rebuilt)).toEqual(listToArray(xs));
                }),
            );
        });

        it("property: fold sums match Array.reduce sums", () => {
            fc.assert(
                fc.property(intList, (xs) => {
                    const arrSum = listToArray(xs).reduce((acc, x) => acc + x, 0);
                    const listSum = L.fold<number, number>(xs)(0)((acc) => (x) => acc + x);
                    expect(listSum).toBe(arrSum);
                }),
            );
        });

        it("property: flatten is concat-associative across the outer list", () => {
            const innerArb = listArb(fc.integer(), { maxLength: 5 });
            const outerArb = listArb(innerArb, { maxLength: 5 });
            fc.assert(
                fc.property(outerArb, (xss) => {
                    const expected: number[] = [];
                    let cur: List<List<number>> = xss;
                    while (cur.$tag === "Cons") {
                        for (const x of listToArray(cur.$0)) expected.push(x);
                        cur = cur.$1;
                    }
                    expect(listToArray(L.flatten(xss))).toEqual(expected);
                }),
            );
        });

        it("property: length(flatten(xss)) === sum of inner lengths", () => {
            const innerArb = listArb(fc.integer(), { maxLength: 5 });
            const outerArb = listArb(innerArb, { maxLength: 5 });
            fc.assert(
                fc.property(outerArb, (xss) => {
                    let expected = 0;
                    let cur: List<List<number>> = xss;
                    while (cur.$tag === "Cons") {
                        expected += L.length(cur.$0);
                        cur = cur.$1;
                    }
                    expect(L.length(L.flatten(xss))).toBe(expected);
                }),
            );
        });
    });
});
