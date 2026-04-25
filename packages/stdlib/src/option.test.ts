import { describe, expect, it } from "vitest";

import * as O from "./option.js";
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
});
