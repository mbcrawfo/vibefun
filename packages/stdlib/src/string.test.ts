import type { List } from "./variants.js";

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import * as S from "./string.js";
import { listToArray } from "./test-arbitraries/index.js";
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

    describe("properties", () => {
        // String.length counts Unicode code points (via spread iterator), so
        // arbitrary strings — including astral characters and surrogate pairs —
        // should produce a length that matches [...s].length.
        it("property: length matches code-point count for any string", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.length(s)).toBe([...s].length);
                }),
            );
        });

        it("property: concat is associative", () => {
            fc.assert(
                fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
                    expect(S.concat(S.concat(a)(b))(c)).toBe(S.concat(a)(S.concat(b)(c)));
                }),
            );
        });

        it("property: empty string is the left and right identity for concat", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.concat("")(s)).toBe(s);
                    expect(S.concat(s)("")).toBe(s);
                }),
            );
        });

        it("property: length(concat(a,b)) === length(a) + length(b)", () => {
            fc.assert(
                fc.property(fc.string(), fc.string(), (a, b) => {
                    expect(S.length(S.concat(a)(b))).toBe(S.length(a) + S.length(b));
                }),
            );
        });

        it("property: toUpperCase/toLowerCase preserve length for ASCII inputs", () => {
            // Unicode case-folding can change length (e.g. "ß".toUpperCase() === "SS"),
            // so this property is only safe over ASCII; covers the common path.
            fc.assert(
                fc.property(fc.stringMatching(/^[\x20-\x7e]*$/), (s) => {
                    expect(S.length(S.toUpperCase(s))).toBe(S.length(s));
                    expect(S.length(S.toLowerCase(s))).toBe(S.length(s));
                }),
            );
        });

        it("property: toLowerCase is idempotent", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.toLowerCase(S.toLowerCase(s))).toBe(S.toLowerCase(s));
                }),
            );
        });

        it("property: toUpperCase is idempotent", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.toUpperCase(S.toUpperCase(s))).toBe(S.toUpperCase(s));
                }),
            );
        });

        it("property: trim is idempotent", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.trim(S.trim(s))).toBe(S.trim(s));
                }),
            );
        });

        it("property: any string starts with itself and ends with itself", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.startsWith(s)(s)).toBe(true);
                    expect(S.endsWith(s)(s)).toBe(true);
                }),
            );
        });

        it("property: any string contains itself and contains the empty string", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(S.contains(s)(s)).toBe(true);
                    expect(S.contains(s)("")).toBe(true);
                }),
            );
        });

        it("property: concat(a,b) starts with a and ends with b", () => {
            fc.assert(
                fc.property(fc.string(), fc.string(), (a, b) => {
                    expect(S.startsWith(S.concat(a)(b))(a)).toBe(true);
                    expect(S.endsWith(S.concat(a)(b))(b)).toBe(true);
                }),
            );
        });

        it("property: fromInt round-trips through Number for safe integers", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(Number(S.fromInt(n))).toBe(n);
                }),
            );
        });

        it("property: fromBool returns 'true' or 'false'", () => {
            fc.assert(
                fc.property(fc.boolean(), (b) => {
                    expect(S.fromBool(b)).toBe(b ? "true" : "false");
                }),
            );
        });

        it("property: toInt(fromInt(n)) === Some(n) for safe integers", () => {
            fc.assert(
                fc.property(fc.maxSafeInteger(), (n) => {
                    expect(S.toInt(S.fromInt(n))).toEqual(Some(n));
                }),
            );
        });

        it("property: split followed by re-join reconstructs the original string", () => {
            // For sep that does not occur in s, split returns [s] and re-join is s.
            // For sep that does occur, the joined parts must equal s by definition.
            fc.assert(
                fc.property(fc.string(), fc.string({ minLength: 1, maxLength: 3 }), (s, sep) => {
                    const parts: List<string> = S.split(s)(sep);
                    expect(listToArray(parts).join(sep)).toBe(s);
                }),
            );
        });

        it("property: toFloat returns Some on any finite double formatted via String, None on empty", () => {
            const finite = fc.double({ noNaN: true, noDefaultInfinity: true });
            fc.assert(
                fc.property(finite, (n) => {
                    const got = S.toFloat(String(n));
                    expect(got.$tag).toBe("Some");
                }),
            );
            expect(S.toFloat("")).toEqual(None);
        });
    });
});
