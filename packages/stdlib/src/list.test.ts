import type { List } from "./variants.js";

import { describe, expect, it } from "vitest";

import * as L from "./list.js";
import { Cons, Nil, None, Some } from "./variants.js";

const fromArray = <A>(arr: A[]): List<A> => {
    let result: List<A> = Nil<A>();
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
            expect(toArray(L.map(Nil<number>())((x) => x * 2))).toEqual([]);
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
            expect(L.fold<number, number>(Nil<number>())(99)((acc) => (x) => acc + x)).toBe(99);
        });
    });

    describe("foldRight", () => {
        it("preserves order when rebuilding", () => {
            const rebuilt = L.foldRight<number, List<number>>(fromArray([1, 2, 3]))(Nil<number>())(
                (x) => (acc) => Cons(x)(acc),
            );
            expect(toArray(rebuilt)).toEqual([1, 2, 3]);
        });
        it("subtraction demonstrates right-to-left order", () => {
            expect(L.foldRight<number, number>(fromArray([1, 2, 3]))(0)((x) => (acc) => x - acc)).toBe(2);
        });
    });

    describe("length", () => {
        it("counts elements", () => {
            expect(L.length(fromArray([1, 2, 3]))).toBe(3);
            expect(L.length(Nil<number>())).toBe(0);
        });
    });

    describe("head/tail", () => {
        it("head returns Some for non-empty, None for empty", () => {
            expect(L.head(fromArray([1, 2, 3]))).toEqual(Some(1));
            expect(L.head(Nil<number>())).toEqual(None());
        });
        it("tail returns Some(rest) for non-empty, None for empty", () => {
            const got = L.tail(fromArray([1, 2, 3]));
            expect(got.$tag).toBe("Some");
            if (got.$tag === "Some") expect(toArray(got.$0)).toEqual([2, 3]);
            expect(L.tail(Nil<number>())).toEqual(None());
        });
    });

    describe("reverse", () => {
        it("reverses elements", () => {
            expect(toArray(L.reverse(fromArray([1, 2, 3])))).toEqual([3, 2, 1]);
            expect(toArray(L.reverse(Nil<number>()))).toEqual([]);
        });
    });

    describe("concat", () => {
        it("joins two lists preserving order", () => {
            expect(toArray(L.concat(fromArray([1, 2]))(fromArray([3, 4])))).toEqual([1, 2, 3, 4]);
        });
        it("handles empty operands", () => {
            expect(toArray(L.concat(Nil<number>())(fromArray([1, 2])))).toEqual([1, 2]);
            expect(toArray(L.concat(fromArray([1, 2]))(Nil<number>()))).toEqual([1, 2]);
        });
    });
});
