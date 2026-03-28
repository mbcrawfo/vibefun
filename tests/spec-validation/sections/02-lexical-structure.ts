/**
 * Spec validation tests for Section 02: Lexical Structure
 *
 * Covers: comments, whitespace, semicolons, keywords, identifiers,
 * literals (int, float, string, bool, unit), operators, error cases.
 */

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "02-lexical-structure";

// --- Comments ---

test(S, "02-lexical-structure/basic-structure.md", "single-line comments", () =>
    expectCompiles(`// This is a comment
let x = 42;`),
);

test(S, "02-lexical-structure/basic-structure.md", "multi-line comments", () =>
    expectCompiles(`/* This is
a multi-line comment */
let x = 42;`),
);

test(S, "02-lexical-structure/basic-structure.md", "nested multi-line comments", () =>
    expectCompiles(`/* outer /* inner */ outer */
let x = 42;`),
);

test(S, "02-lexical-structure/basic-structure.md", "unterminated multi-line comment error", () =>
    expectCompileError(`/* unterminated`, "VF1"),
);

// --- Whitespace & Semicolons ---

test(S, "02-lexical-structure/basic-structure.md", "semicolons required between declarations", () =>
    expectCompiles(`let x = 1;
let y = 2;`),
);

test(S, "02-lexical-structure/basic-structure.md", "missing semicolon is error", () =>
    expectCompileError(`let x = 1
let y = 2`),
);

test(S, "02-lexical-structure/basic-structure.md", "multi-line expressions without semicolons", () =>
    expectCompiles(`let x = 1
  + 2
  + 3;`),
);

test(S, "02-lexical-structure/basic-structure.md", "empty blocks valid without semicolons", () =>
    expectCompiles(`let x = {};`),
);

// --- Keywords ---

test(S, "02-lexical-structure/tokens.md", "keywords cannot be used as variable names", () =>
    expectCompileError(`let let = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "keywords as record field names", () =>
    expectCompiles(`let x = { type: "value", import: "path" };`),
);

test(S, "02-lexical-structure/tokens.md", "keyword field access", () =>
    expectRunOutput(withOutput(`let x = { type: "hello" };`, `x.type`), "hello"),
);

// --- Identifiers ---

test(S, "02-lexical-structure/tokens.md", "camelCase identifiers", () => expectCompiles(`let myVariable = 42;`));

test(S, "02-lexical-structure/tokens.md", "underscore-prefixed identifiers", () => expectCompiles(`let _unused = 42;`));

test(S, "02-lexical-structure/tokens.md", "unicode identifiers", () => expectCompiles(`let caf\u00e9 = "coffee";`));

// --- Boolean Literals ---

test(S, "02-lexical-structure/tokens.md", "boolean literal true", () =>
    expectRunOutput(withOutput(`let x = true;`, `String.fromBool(x)`), "true"),
);

test(S, "02-lexical-structure/tokens.md", "boolean literal false", () =>
    expectRunOutput(withOutput(`let x = false;`, `String.fromBool(x)`), "false"),
);

// --- Integer Literals ---

test(S, "02-lexical-structure/tokens.md", "decimal integer literal", () =>
    expectRunOutput(withOutput(`let x = 42;`, `String.fromInt(x)`), "42"),
);

test(S, "02-lexical-structure/tokens.md", "hexadecimal integer literal", () =>
    expectRunOutput(withOutput(`let x = 0xFF;`, `String.fromInt(x)`), "255"),
);

test(S, "02-lexical-structure/tokens.md", "binary integer literal", () =>
    expectRunOutput(withOutput(`let x = 0b1010;`, `String.fromInt(x)`), "10"),
);

test(S, "02-lexical-structure/tokens.md", "underscore separators in integers", () =>
    expectRunOutput(withOutput(`let x = 1_000_000;`, `String.fromInt(x)`), "1000000"),
);

test(S, "02-lexical-structure/tokens.md", "leading zeros are decimal (not octal)", () =>
    expectRunOutput(withOutput(`let x = 0123;`, `String.fromInt(x)`), "123"),
);

// --- Float Literals ---

test(S, "02-lexical-structure/tokens.md", "basic float literal", () =>
    expectRunOutput(withOutput(`let x = 3.14;`, `String.fromFloat(x)`), "3.14"),
);

test(S, "02-lexical-structure/tokens.md", "scientific notation float", () =>
    expectRunOutput(withOutput(`let x = 1e10;`, `String.fromFloat(x)`), "10000000000"),
);

test(S, "02-lexical-structure/tokens.md", "scientific notation with negative exponent", () =>
    expectRunOutput(withOutput(`let x = 3.14e-2;`, `String.fromFloat(x)`), "0.0314"),
);

// --- String Literals ---

test(S, "02-lexical-structure/tokens.md", "basic string literal", () =>
    expectRunOutput(withOutput(`let x = "hello";`, `x`), "hello"),
);

test(S, "02-lexical-structure/tokens.md", "string escape sequences", () =>
    expectRunOutput(withOutput(`let x = "line1\\nline2";`, `x`), "line1\nline2"),
);

test(S, "02-lexical-structure/tokens.md", "hex escape in string", () =>
    expectRunOutput(withOutput(`let x = "\\x41";`, `x`), "A"),
);

test(S, "02-lexical-structure/tokens.md", "unicode escape in string", () =>
    expectRunOutput(withOutput(`let x = "\\u03B1";`, `x`), "\u03B1"),
);

test(S, "02-lexical-structure/tokens.md", "long unicode escape in string", () =>
    expectRunOutput(withOutput(`let x = "\\u{1F600}";`, `x`), "\u{1F600}"),
);

test(S, "02-lexical-structure/tokens.md", "multi-line string literal", () =>
    expectCompiles(`let x = """hello
world""";`),
);

test(S, "02-lexical-structure/tokens.md", "invalid escape sequence error", () =>
    expectCompileError(`let x = "\\q";`, "VF1"),
);

test(S, "02-lexical-structure/tokens.md", "unterminated string error", () =>
    expectCompileError(`let x = "unterminated`, "VF1"),
);

// --- Unit Literal ---

test(S, "02-lexical-structure/tokens.md", "unit literal", () => expectCompiles(`let x = ();`));

// --- Number Error Cases ---

test(S, "02-lexical-structure/tokens.md", "multiple decimal points error", () => expectCompileError(`let x = 1.2.3;`));

test(S, "02-lexical-structure/tokens.md", "trailing underscore in number error", () =>
    expectCompileError(`let x = 123_;`),
);

test(S, "02-lexical-structure/tokens.md", "consecutive underscores in number error", () =>
    expectCompileError(`let x = 1__000;`),
);

// --- Operators ---

test(S, "02-lexical-structure/operators.md", "arithmetic operators compile", () =>
    expectCompiles(`let a = 1 + 2;
let b = 3 - 1;
let c = 2 * 3;
let d = 10 / 2;
let e = 7 % 3;`),
);

test(S, "02-lexical-structure/operators.md", "comparison operators compile", () =>
    expectCompiles(
        `let a = 1 == 2;
let b = 1 != 2;
let c = 1 < 2;
let d = 1 <= 2;
let e = 1 > 2;
let f = 1 >= 2;`,
    ),
);

test(S, "02-lexical-structure/operators.md", "logical operators compile", () =>
    expectCompiles(`let a = true && false;
let b = true || false;
let c = !true;`),
);

test(S, "02-lexical-structure/operators.md", "string concatenation operator", () =>
    expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world"),
);

test(S, "02-lexical-structure/operators.md", "pipe operator", () =>
    expectRunOutput(
        withOutput(
            `let double = (x: Int) => x * 2;
let result = 5 |> double;`,
            `String.fromInt(result)`,
        ),
        "10",
    ),
);

test(S, "02-lexical-structure/operators.md", "list cons operator", () => expectCompiles(`let x = 1 :: [2, 3];`));

test(S, "02-lexical-structure/operators.md", "unary minus operator", () =>
    expectRunOutput(withOutput(`let x = -42;`, `String.fromInt(x)`), "-42"),
);

test(S, "02-lexical-structure/operators.md", "composition operators compile", () =>
    expectCompiles(
        `let f = (x: Int) => x + 1;
let g = (x: Int) => x * 2;
let h = f >> g;
let i = f << g;`,
    ),
);

test(S, "02-lexical-structure/operators.md", "reference operators compile", () =>
    expectCompiles(
        `let mut x = ref(0);
let y = !x;
x := 1;`,
    ),
);

test(S, "02-lexical-structure/operators.md", "spread operator in list", () =>
    expectCompiles(
        `let xs = [1, 2];
let ys = [0, ...xs];`,
    ),
);

// --- Additional Keyword Tests ---

test(S, "02-lexical-structure/tokens.md", "match keyword cannot be variable name", () =>
    expectCompileError(`let match = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "type keyword cannot be variable name", () =>
    expectCompileError(`let type = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "while keyword cannot be variable name", () =>
    expectCompileError(`let while = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "reserved future keyword async rejected", () =>
    expectCompileError(`let async = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "reserved future keyword await rejected", () =>
    expectCompileError(`let await = 42;`),
);

test(S, "02-lexical-structure/tokens.md", "reserved future keyword return rejected", () =>
    expectCompileError(`let return = 42;`),
);

// --- Additional Number Error Cases ---

test(S, "02-lexical-structure/tokens.md", "invalid hex digit error", () => expectCompileError(`let x = 0xGG;`));

test(S, "02-lexical-structure/tokens.md", "invalid binary digit error", () => expectCompileError(`let x = 0b1012;`));

test(S, "02-lexical-structure/tokens.md", "leading decimal without integer error", () =>
    expectCompileError(`let x = .5;`),
);

test(S, "02-lexical-structure/tokens.md", "trailing decimal without fraction error", () =>
    expectCompileError(`let x = 5.;`),
);

// --- Additional String Error Cases ---

test(S, "02-lexical-structure/tokens.md", "incomplete hex escape error", () =>
    expectCompileError(`let x = "\\x4";`, "VF1"),
);

test(S, "02-lexical-structure/tokens.md", "incomplete unicode escape error", () =>
    expectCompileError(`let x = "\\u03";`, "VF1"),
);

test(S, "02-lexical-structure/tokens.md", "unterminated long unicode escape error", () =>
    expectCompileError(`let x = "\\u{12";`, "VF1"),
);

test(S, "02-lexical-structure/tokens.md", "out-of-range unicode escape error", () =>
    expectCompileError(`let x = "\\u{110000}";`, "VF1"),
);

// --- Additional Escape Sequence Tests ---

test(S, "02-lexical-structure/tokens.md", "tab escape in string", () =>
    expectRunOutput(withOutput(`let x = "a\\tb";`, `x`), "a\tb"),
);

test(S, "02-lexical-structure/tokens.md", "backslash escape in string", () =>
    expectRunOutput(withOutput(`let x = "a\\\\b";`, `x`), "a\\b"),
);

test(S, "02-lexical-structure/tokens.md", "double quote escape in string", () =>
    expectRunOutput(withOutput(`let x = "say \\"hi\\"";`, `x`), 'say "hi"'),
);

// --- Identifier Edge Cases ---

test(S, "02-lexical-structure/tokens.md", "emoji identifier", () => expectCompiles(`let \u{1F680} = 42;`));
