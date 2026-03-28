/**
 * Spec validation tests for Section 07: Mutable References
 *
 * Covers: Ref creation, dereference, assignment, dual-purpose !,
 * equality/aliasing, value restriction.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "07-mutable-references";

// --- Creating References ---

test(S, "07-mutable-references.md", "create ref with mut keyword", () => expectCompiles(`let mut x = ref(10);`));

test(S, "07-mutable-references.md", "ref without mut is error", () => expectCompileError(`let x = ref(10);`));

test(S, "07-mutable-references.md", "ref with different types", () =>
    expectCompiles(
        `let mut a = ref(42);
let mut b = ref("hello");
let mut c = ref(true);`,
    ),
);

// --- Reading References (Dereference) ---

test(S, "07-mutable-references.md", "dereference with !", () =>
    expectRunOutput(withOutput(`let mut x = ref(42);`, `String.fromInt(!x)`), "42"),
);

test(S, "07-mutable-references.md", "dereference string ref", () =>
    expectRunOutput(withOutput(`let mut s = ref("hello");`, `!s`), "hello"),
);

// --- Updating References ---

test(S, "07-mutable-references.md", "update ref with :=", () =>
    expectRunOutput(
        withOutput(
            `let mut x = ref(10);
x := 20;`,
            `String.fromInt(!x)`,
        ),
        "20",
    ),
);

test(S, "07-mutable-references.md", "assignment returns Unit", () =>
    expectCompiles(
        `let mut x = ref(10);
let result: Unit = x := 20;`,
    ),
);

test(S, "07-mutable-references.md", "update ref with computed value", () =>
    expectRunOutput(
        withOutput(
            `let mut x = ref(10);
x := !x + 5;`,
            `String.fromInt(!x)`,
        ),
        "15",
    ),
);

// --- Dual-Purpose ! Operator ---

test(S, "07-mutable-references.md", "! as logical NOT for Bool", () =>
    expectRunOutput(withOutput(`let x = !true;`, `String.fromBool(x)`), "false"),
);

test(S, "07-mutable-references.md", "! as dereference for Ref", () =>
    expectRunOutput(withOutput(`let mut x = ref(42);`, `String.fromInt(!x)`), "42"),
);

// --- Ref Equality & Aliasing ---

test(S, "07-mutable-references.md", "two refs to same value are not equal (identity equality)", () =>
    expectRunOutput(
        withOutput(
            `let mut a = ref(10);
let mut b = ref(10);`,
            `String.fromBool(a == b)`,
        ),
        "false",
    ),
);

test(S, "07-mutable-references.md", "aliased refs are equal", () =>
    expectRunOutput(
        withOutput(
            `let mut a = ref(10);
let mut b = a;`,
            `String.fromBool(a == b)`,
        ),
        "true",
    ),
);

test(S, "07-mutable-references.md", "mutations visible through aliases", () =>
    expectRunOutput(
        withOutput(
            `let mut a = ref(10);
let mut b = a;
a := 20;`,
            `String.fromInt(!b)`,
        ),
        "20",
    ),
);

// --- While Loop with Refs ---

test(S, "07-mutable-references.md", "while loop with mutable counter", () =>
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
    ),
);

// --- Refs in Data Structures ---

test(S, "07-mutable-references.md", "record with ref field", () =>
    expectRunOutput(
        withOutput(
            `let mut counter = ref(0);
let obj = { counter: counter };
obj.counter := 5;`,
            `String.fromInt(!obj.counter)`,
        ),
        "5",
    ),
);
