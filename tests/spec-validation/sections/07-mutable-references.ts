/**
 * Spec validation tests for Section 07: Mutable References
 *
 * Covers: Ref creation, dereference, assignment, dual-purpose !,
 * equality/aliasing, value restriction.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.js";
import { test } from "../framework/runner.js";

const S = "07-mutable-references";

// --- Creating References ---

test(S, "07-mutable-references.md", "create ref with mut keyword", () => expectCompiles(`let mut x = ref(10);`));

test(S, "07-mutable-references.md", "ref without mut is error", () => expectCompileError(`let x = ref(10);`));

test(S, "07-mutable-references.md", "ref with different types", () =>
    expectCompiles(`let mut a = ref(42);\nlet mut b = ref("hello");\nlet mut c = ref(true);`),
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
    expectRunOutput(withOutput(`let mut x = ref(10);\nx := 20;`, `String.fromInt(!x)`), "20"),
);

test(S, "07-mutable-references.md", "assignment returns Unit", () =>
    expectCompiles(`let mut x = ref(10);\nlet result: Unit = x := 20;`),
);

test(S, "07-mutable-references.md", "update ref with computed value", () =>
    expectRunOutput(withOutput(`let mut x = ref(10);\nx := !x + 5;`, `String.fromInt(!x)`), "15"),
);

// --- Dual-Purpose ! Operator ---

test(S, "07-mutable-references.md", "! as logical NOT for Bool", () =>
    expectRunOutput(withOutput(`let x = !true;`, `if x then "true" else "false"`), "false"),
);

test(S, "07-mutable-references.md", "! as dereference for Ref", () =>
    expectRunOutput(withOutput(`let mut x = ref(42);`, `String.fromInt(!x)`), "42"),
);

// --- Ref Equality & Aliasing ---

test(S, "07-mutable-references.md", "two refs to same value are not equal (identity equality)", () =>
    expectRunOutput(
        withOutput(`let mut a = ref(10);\nlet mut b = ref(10);`, `if a == b then "equal" else "not-equal"`),
        "not-equal",
    ),
);

test(S, "07-mutable-references.md", "aliased refs are equal", () =>
    expectRunOutput(
        withOutput(`let mut a = ref(10);\nlet mut b = a;`, `if a == b then "equal" else "not-equal"`),
        "equal",
    ),
);

test(S, "07-mutable-references.md", "mutations visible through aliases", () =>
    expectRunOutput(withOutput(`let mut a = ref(10);\nlet mut b = a;\na := 20;`, `String.fromInt(!b)`), "20"),
);

// --- While Loop with Refs ---

test(S, "07-mutable-references.md", "while loop with mutable counter", () =>
    expectRunOutput(
        withOutput(
            `let mut sum = ref(0);\nlet mut i = ref(1);\nwhile !i <= 5 {\n  sum := !sum + !i;\n  i := !i + 1;\n};`,
            `String.fromInt(!sum)`,
        ),
        "15",
    ),
);

// --- Refs in Data Structures ---

test(S, "07-mutable-references.md", "record with ref field", () =>
    expectRunOutput(
        withOutput(
            `let mut counter = ref(0);\nlet obj = { counter: counter };\nobj.counter := 5;`,
            `String.fromInt(!obj.counter)`,
        ),
        "5",
    ),
);
