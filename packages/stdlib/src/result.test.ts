import { describe, expect, it } from "vitest";

import * as R from "./result.js";
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
});
