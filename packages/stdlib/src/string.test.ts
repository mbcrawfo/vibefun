import type { List } from "./variants.js";

import { describe, expect, it } from "vitest";

import * as S from "./string.js";
import { None, Some } from "./variants.js";

const toArray = <A>(list: List<A>): A[] => {
    const out: A[] = [];
    let cur: List<A> = list;
    while (cur.$tag === "Cons") {
        out.push(cur.$0);
        cur = cur.$1;
    }
    return out;
};

describe("String", () => {
    it("length counts Unicode code points", () => {
        expect(S.length("hello")).toBe(5);
        expect(S.length("")).toBe(0);
        expect(S.length("🎉")).toBe(1);
    });
    it("concat glues two strings", () => {
        expect(S.concat("hello")(" world")).toBe("hello world");
    });
    it("fromInt stringifies integers", () => {
        expect(S.fromInt(42)).toBe("42");
        expect(S.fromInt(-10)).toBe("-10");
        expect(S.fromInt(0)).toBe("0");
    });
    it("fromFloat renders integers without .0 suffix", () => {
        expect(S.fromFloat(3.14)).toBe("3.14");
        expect(S.fromFloat(-2.5)).toBe("-2.5");
        expect(S.fromFloat(1.0)).toBe("1");
    });
    it("fromBool stringifies booleans", () => {
        expect(S.fromBool(true)).toBe("true");
        expect(S.fromBool(false)).toBe("false");
    });
    it("toUpperCase / toLowerCase / trim", () => {
        expect(S.toUpperCase("hello")).toBe("HELLO");
        expect(S.toLowerCase("HELLO")).toBe("hello");
        expect(S.trim("  hi  ")).toBe("hi");
    });
    it("split returns a List", () => {
        expect(toArray(S.split("a,b,c")(","))).toEqual(["a", "b", "c"]);
        expect(toArray(S.split("no-sep")(","))).toEqual(["no-sep"]);
    });
    it("contains / startsWith / endsWith", () => {
        expect(S.contains("hello world")("world")).toBe(true);
        expect(S.contains("hello")("bye")).toBe(false);
        expect(S.startsWith("hello")("hel")).toBe(true);
        expect(S.startsWith("hello")("world")).toBe(false);
        expect(S.endsWith("hello")("llo")).toBe(true);
        expect(S.endsWith("hello")("world")).toBe(false);
    });
    it("toInt returns Some for valid integers, None otherwise", () => {
        expect(S.toInt("42")).toEqual(Some(42));
        expect(S.toInt("-10")).toEqual(Some(-10));
        expect(S.toInt("3.14")).toEqual(None);
        expect(S.toInt("hello")).toEqual(None);
        expect(S.toInt("")).toEqual(None);
    });
    it("toFloat returns Some for valid numbers, None otherwise", () => {
        expect(S.toFloat("3.14")).toEqual(Some(3.14));
        expect(S.toFloat("42")).toEqual(Some(42));
        expect(S.toFloat("-2.5")).toEqual(Some(-2.5));
        expect(S.toFloat("hello")).toEqual(None);
        expect(S.toFloat("")).toEqual(None);
    });
});
