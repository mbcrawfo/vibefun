import { describe, expect, it } from "vitest";

import { Cons, Err, Nil, None, Ok, Some } from "./variants.js";

describe("variants", () => {
    it("Cons builds a two-field node with $tag Cons", () => {
        const node = Cons(1)(Cons(2)(Nil()));
        expect(node).toEqual({
            $tag: "Cons",
            $0: 1,
            $1: { $tag: "Cons", $0: 2, $1: { $tag: "Nil" } },
        });
    });

    it("Nil produces a fresh zero-field node each call", () => {
        const a = Nil<number>();
        const b = Nil<number>();
        expect(a).toEqual({ $tag: "Nil" });
        expect(a).not.toBe(b);
    });

    it("Some wraps a value", () => {
        expect(Some(42)).toEqual({ $tag: "Some", $0: 42 });
    });

    it("None produces a fresh zero-field node each call", () => {
        expect(None()).toEqual({ $tag: "None" });
        expect(None()).not.toBe(None());
    });

    it("Ok and Err carry the value in $0", () => {
        expect(Ok<number, string>(1)).toEqual({ $tag: "Ok", $0: 1 });
        expect(Err<number, string>("boom")).toEqual({ $tag: "Err", $0: "boom" });
    });
});
