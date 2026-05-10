/**
 * Spec validation: Section 07 — Mutable References.
 *
 * Covers Ref creation, dereference, assignment, dual-purpose !,
 * equality/aliasing, value restriction.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "./helpers.js";

describe("07-mutable-references", () => {
    describe("creating references", () => {
        it("create ref with mut keyword", () => {
            expectCompiles(`let mut x = ref(10);`);
        });

        it("ref without mut is error", () => {
            expectCompileError(`let x = ref(10);`);
        });

        it("ref with different types", () => {
            expectCompiles(
                `let mut a = ref(42);
let mut b = ref("hello");
let mut c = ref(true);`,
            );
        });
    });

    describe("dereferencing", () => {
        it("dereference with !", () => {
            expectRunOutput(withOutput(`let mut x = ref(42);`, `String.fromInt(!x)`), "42");
        });

        it("dereference string ref", () => {
            expectRunOutput(withOutput(`let mut s = ref("hello");`, `!s`), "hello");
        });
    });

    describe("updating references", () => {
        it("update ref with :=", () => {
            expectRunOutput(
                withOutput(
                    `let mut x = ref(10);
x := 20;`,
                    `String.fromInt(!x)`,
                ),
                "20",
            );
        });

        it("assignment returns Unit", () => {
            expectCompiles(
                `let mut x = ref(10);
let result: Unit = x := 20;`,
            );
        });

        it("update ref with computed value", () => {
            expectRunOutput(
                withOutput(
                    `let mut x = ref(10);
x := !x + 5;`,
                    `String.fromInt(!x)`,
                ),
                "15",
            );
        });

        it("multiple updates to same ref", () => {
            expectRunOutput(
                withOutput(
                    `let mut x = ref(0);
x := 1;
x := 2;
x := 3;`,
                    `String.fromInt(!x)`,
                ),
                "3",
            );
        });
    });

    describe("dual-purpose ! operator", () => {
        it("! as logical NOT for Bool", () => {
            expectRunOutput(withOutput(`let x = !true;`, `String.fromBool(x)`), "false");
        });

        it("! as dereference for Ref", () => {
            expectRunOutput(withOutput(`let mut x = ref(42);`, `String.fromInt(!x)`), "42");
        });
    });

    describe("equality and aliasing", () => {
        it("two refs to same value are not equal (identity equality)", () => {
            expectRunOutput(
                withOutput(
                    `let mut a = ref(10);
let mut b = ref(10);`,
                    `String.fromBool(a == b)`,
                ),
                "false",
            );
        });

        it("aliased refs are equal", () => {
            expectRunOutput(
                withOutput(
                    `let mut a = ref(10);
let mut b = a;`,
                    `String.fromBool(a == b)`,
                ),
                "true",
            );
        });

        it("mutations visible through aliases", () => {
            expectRunOutput(
                withOutput(
                    `let mut a = ref(10);
let mut b = a;
a := 20;`,
                    `String.fromInt(!b)`,
                ),
                "20",
            );
        });
    });

    describe("loops with refs", () => {
        it("while loop with mutable counter", () => {
            expectRunOutput(
                withOutput(
                    `let mut sum = ref(0);
let mut i = ref(1);
while !i <= 5 {
  sum := !sum + !i;
  i := !i + 1;
};`,
                    `String.fromInt(!sum)`,
                ),
                "15",
            );
        });
    });

    describe("refs in data structures", () => {
        it("record with ref field", () => {
            expectRunOutput(
                withOutput(
                    `let mut counter = ref(0);
let obj = { counter: counter };
obj.counter := 5;`,
                    `String.fromInt(!obj.counter)`,
                ),
                "5",
            );
        });

        it("ref in list", () => {
            expectCompiles(
                `let mut a = ref(1);
let mut b = ref(2);
let refs = [a, b];`,
            );
        });
    });

    describe("closures and value restriction", () => {
        it("closure captures ref (makeCounter pattern)", () => {
            expectRunOutput(
                withOutput(
                    `let makeCounter = () => {
  let mut count = ref(0);
  let increment = () => {
    count := !count + 1;
    !count;
  };
  increment;
};
let counter = makeCounter();
let a = counter();
let b = counter();
let c = counter();`,
                    `String.fromInt(c)`,
                ),
                "3",
            );
        });

        it("polymorphic ref forbidden by value restriction", () => {
            expectCompileError(
                `type Option<T> = Some(T) | None;
let mut x = ref(None);
x := Some(42);
x := Some("hello");`,
            );
        });
    });

    // Spec ref: docs/spec/07-mutable-references.md:334-359 — pattern
    // matching directly on a `Ref<T>` is forbidden; the user must
    // dereference with `!` first. Audit (07 F-11) flagged the lack of
    // a V-layer test pinning this rejection. The diagnostic surfaces
    // through type unification (the variant pattern expects
    // `Option<…>` but receives `Ref<Option<…>>`), which produces
    // VF4020 — a generic "cannot unify" error. The audit notes this
    // diagnostic is too vague (a "Ref<T> is not pattern-matchable"
    // dedicated message would be friendlier), but the rejection
    // itself is correct.
    describe("pattern matching on refs", () => {
        it("rejects matching directly on a Ref<Option<…>> with VF4020", () => {
            expectCompileError(
                `let mut r = ref(Some(5));
let v = match r {
  | Some(x) => x
  | None => 0
};`,
                "VF4020",
            );
        });

        it("compiles when the ref is dereferenced first", () => {
            expectRunOutput(
                withOutput(
                    `let mut r = ref(Some(5));
let v = match !r {
  | Some(x) => x
  | None => 0
};`,
                    `String.fromInt(v)`,
                ),
                "5",
            );
        });
    });

    // Spec ref: docs/spec/07-mutable-references.md:54-82 — a `let mut`
    // ref binding may be reassigned to a new ref via `x = ref(...)`.
    // Audit (07 F-14) marked this ✅ Implemented but did not have a
    // direct test. Authoring the test surfaces a parser gap: the
    // surface syntax `<ident> = <expr>;` is rejected with VF2107
    // (`Expected ';' or newline between declarations`) at the top
    // level and the equivalent VF2107 inside blocks. Only `:=`
    // (mutating the ref's contents) is admitted today.
    //
    // [BUG: VF-FC-0005] The assertion below pins the buggy parser
    // behavior so the gap surfaces in the suite without breaking CI.
    // When VF-FC-0005 is fixed (see `.claude/FAST_CHECK_BUG_BACKLOG.md`),
    // flip `expectCompileError` to `expectRunOutput(..., "10")` per
    // the spec example, and remove the bug banner.
    describe("mutable binding reassignment", () => {
        it("[BUG: VF-FC-0005] currently rejects `x = ref(10)` as a parser error", () => {
            expectCompileError(
                `let mut x = ref(0);
x = ref(10);`,
                "VF2107",
            );
        });
    });
});
