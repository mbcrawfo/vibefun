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
});
