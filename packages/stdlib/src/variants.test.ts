import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { Cons, Err, Nil, None, Ok, Some } from "./variants.js";

describe("variants", () => {
    it("Cons builds a two-field node with $tag Cons", () => {
        const node = Cons(1)(Cons(2)(Nil));
        expect(node).toEqual({
            $tag: "Cons",
            $0: 1,
            $1: { $tag: "Cons", $0: 2, $1: { $tag: "Nil" } },
        });
    });

    it("Nil is a singleton zero-field node", () => {
        expect(Nil).toEqual({ $tag: "Nil" });
    });

    it("Some wraps a value", () => {
        expect(Some(42)).toEqual({ $tag: "Some", $0: 42 });
    });

    it("None is a singleton zero-field node", () => {
        expect(None).toEqual({ $tag: "None" });
    });

    it("Ok and Err carry the value in $0", () => {
        expect(Ok<number, string>(1)).toEqual({ $tag: "Ok", $0: 1 });
        expect(Err<number, string>("boom")).toEqual({ $tag: "Err", $0: "boom" });
    });

    describe("properties", () => {
        it("property: Some(a).$0 === a for any value", () => {
            fc.assert(
                fc.property(fc.anything(), (a) => {
                    const s = Some(a);
                    expect(s.$tag).toBe("Some");
                    if (s.$tag === "Some") expect(s.$0).toBe(a);
                }),
            );
        });

        it("property: Ok(a).$0 === a and tag is 'Ok'", () => {
            fc.assert(
                fc.property(fc.anything(), (a) => {
                    const r = Ok<unknown, string>(a);
                    expect(r.$tag).toBe("Ok");
                    if (r.$tag === "Ok") expect(r.$0).toBe(a);
                }),
            );
        });

        it("property: Err(e).$0 === e and tag is 'Err'", () => {
            fc.assert(
                fc.property(fc.anything(), (e) => {
                    const r = Err<number, unknown>(e);
                    expect(r.$tag).toBe("Err");
                    if (r.$tag === "Err") expect(r.$0).toBe(e);
                }),
            );
        });

        it("property: Cons(h)(t) is a node carrying h and t", () => {
            fc.assert(
                fc.property(fc.integer(), (h) => {
                    const node = Cons(h)(Nil);
                    expect(node.$tag).toBe("Cons");
                    if (node.$tag === "Cons") {
                        expect(node.$0).toBe(h);
                        expect(node.$1).toBe(Nil);
                    }
                }),
            );
        });

        it("property: Cons preserves the tail unchanged at every depth", () => {
            fc.assert(
                fc.property(fc.array(fc.integer(), { maxLength: 20 }), (xs) => {
                    let cur = Nil as ReturnType<typeof Cons<number>> extends (...a: never[]) => infer R ? R : never;
                    for (let i = xs.length - 1; i >= 0; i--) cur = Cons(xs[i] as number)(cur);
                    let depth = 0;
                    let walker = cur;
                    while (walker.$tag === "Cons") {
                        expect(walker.$0).toBe(xs[depth]);
                        walker = walker.$1;
                        depth++;
                    }
                    expect(depth).toBe(xs.length);
                    expect(walker.$tag).toBe("Nil");
                }),
            );
        });

        it("property: variant tags are pairwise distinct", () => {
            // Constructor tags must never collide — pattern matching depends on this.
            const tags = new Set([
                Some(0).$tag,
                None.$tag,
                Ok<number, string>(0).$tag,
                Err<number, string>("").$tag,
                Cons(0)(Nil).$tag,
                Nil.$tag,
            ]);
            expect(tags.size).toBe(6);
        });
    });
});
