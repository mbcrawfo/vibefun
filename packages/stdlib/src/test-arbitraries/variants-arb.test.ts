import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { Cons, Err, Nil, None, Ok, Some } from "../variants.js";
import { listArb, listToArray, optionArb, resultArb } from "./index.js";

describe("variants arbitraries", () => {
    describe("optionArb", () => {
        it("only produces Some or None", () => {
            fc.assert(
                fc.property(optionArb(fc.integer()), (opt) => {
                    return opt.$tag === "Some" || opt.$tag === "None";
                }),
            );
        });

        it("Some carries the generated value", () => {
            fc.assert(
                fc.property(optionArb(fc.integer()), (opt) => {
                    if (opt.$tag === "Some") {
                        return typeof opt.$0 === "number";
                    }
                    return true;
                }),
            );
        });

        it("None is the singleton value", () => {
            fc.assert(
                fc.property(optionArb(fc.integer()), (opt) => {
                    if (opt.$tag === "None") {
                        return opt === None;
                    }
                    return true;
                }),
            );
        });
    });

    describe("resultArb", () => {
        it("only produces Ok or Err", () => {
            fc.assert(
                fc.property(resultArb(fc.integer(), fc.string()), (r) => {
                    return r.$tag === "Ok" || r.$tag === "Err";
                }),
            );
        });

        it("Ok wraps the value arbitrary; Err wraps the error arbitrary", () => {
            fc.assert(
                fc.property(resultArb(fc.integer(), fc.string()), (r) => {
                    if (r.$tag === "Ok") return typeof r.$0 === "number";
                    return typeof r.$0 === "string";
                }),
            );
        });
    });

    describe("listArb", () => {
        it("only produces Cons or Nil at every layer", () => {
            fc.assert(
                fc.property(listArb(fc.integer()), (list) => {
                    let cur = list;
                    while (cur.$tag === "Cons") cur = cur.$1;
                    return cur.$tag === "Nil";
                }),
            );
        });

        it("respects maxLength when provided", () => {
            fc.assert(
                fc.property(listArb(fc.integer(), { maxLength: 5 }), (list) => {
                    return listToArray(list).length <= 5;
                }),
            );
        });

        it("listToArray inverts the Cons/Nil chain", () => {
            fc.assert(
                fc.property(fc.array(fc.integer()), (arr) => {
                    let list = Nil as ReturnType<typeof Cons<number>> extends (...a: never[]) => infer R ? R : never;
                    for (let i = arr.length - 1; i >= 0; i--) list = Cons(arr[i] as number)(list);
                    expect(listToArray(list)).toEqual(arr);
                }),
            );
        });
    });

    it("constructors are still importable for ad-hoc test data", () => {
        // Sanity: the stdlib re-exports the variant constructors that
        // arbitraries lean on. If this assertion ever flips, arbitraries
        // would silently produce malformed shapes.
        expect(Some(1).$tag).toBe("Some");
        expect(None.$tag).toBe("None");
        expect(Ok(1).$tag).toBe("Ok");
        expect(Err("e").$tag).toBe("Err");
    });
});
