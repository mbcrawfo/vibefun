/**
 * Spec validation: Section 02 — Lexical Structure.
 *
 * Covers comments, whitespace, semicolons, keywords, identifiers,
 * literals (int, float, string, bool, unit), operators, and error
 * cases.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectCompiles, expectRunOutput, withOutput } from "./helpers.js";

describe("02-lexical-structure", () => {
    describe("comments", () => {
        it("single-line comments", () => {
            expectCompiles(`// This is a comment
let x = 42;`);
        });

        it("multi-line comments", () => {
            expectCompiles(`/* This is
a multi-line comment */
let x = 42;`);
        });

        it("nested multi-line comments", () => {
            expectCompiles(`/* outer /* inner */ outer */
let x = 42;`);
        });

        it("unterminated multi-line comment error", () => {
            expectCompileError(`/* unterminated`, "VF1");
        });
    });

    describe("whitespace and semicolons", () => {
        it("semicolons required between declarations", () => {
            expectCompiles(`let x = 1;
let y = 2;`);
        });

        it("missing semicolon is error", () => {
            expectCompileError(`let x = 1
let y = 2`);
        });

        it("multi-line expressions without semicolons", () => {
            expectCompiles(`let x = 1
  + 2
  + 3;`);
        });

        it("empty blocks valid without semicolons", () => {
            expectCompiles(`let x = {};`);
        });
    });

    describe("keywords", () => {
        it("keywords cannot be used as variable names", () => {
            expectCompileError(`let let = 42;`);
        });

        it("keywords as record field names", () => {
            expectCompiles(`let x = { type: "value", import: "path" };`);
        });

        it("keyword field access", () => {
            expectRunOutput(withOutput(`let x = { type: "hello" };`, `x.type`), "hello");
        });

        it("match keyword cannot be variable name", () => {
            expectCompileError(`let match = 42;`);
        });

        it("type keyword cannot be variable name", () => {
            expectCompileError(`let type = 42;`);
        });

        it("while keyword cannot be variable name", () => {
            expectCompileError(`let while = 42;`);
        });

        it("reserved future keyword async rejected", () => {
            expectCompileError(`let async = 42;`);
        });

        it("reserved future keyword await rejected", () => {
            expectCompileError(`let await = 42;`);
        });

        it("reserved future keyword return rejected", () => {
            expectCompileError(`let return = 42;`);
        });
    });

    describe("identifiers", () => {
        it("camelCase identifiers", () => {
            expectCompiles(`let myVariable = 42;`);
        });

        it("underscore-prefixed identifiers", () => {
            expectCompiles(`let _unused = 42;`);
        });

        it("unicode identifiers", () => {
            expectCompiles(`let café = "coffee";`);
        });

        it("emoji identifier", () => {
            expectCompiles(`let \u{1F680} = 42;`);
        });
    });

    describe("boolean literals", () => {
        it("boolean literal true", () => {
            expectRunOutput(withOutput(`let x = true;`, `String.fromBool(x)`), "true");
        });

        it("boolean literal false", () => {
            expectRunOutput(withOutput(`let x = false;`, `String.fromBool(x)`), "false");
        });
    });

    describe("integer literals", () => {
        it("decimal integer literal", () => {
            expectRunOutput(withOutput(`let x = 42;`, `String.fromInt(x)`), "42");
        });

        it("hexadecimal integer literal", () => {
            expectRunOutput(withOutput(`let x = 0xFF;`, `String.fromInt(x)`), "255");
        });

        it("binary integer literal", () => {
            expectRunOutput(withOutput(`let x = 0b1010;`, `String.fromInt(x)`), "10");
        });

        it("underscore separators in integers", () => {
            expectRunOutput(withOutput(`let x = 1_000_000;`, `String.fromInt(x)`), "1000000");
        });

        it("leading zeros are decimal (not octal)", () => {
            expectRunOutput(withOutput(`let x = 0123;`, `String.fromInt(x)`), "123");
        });

        it("invalid hex digit error", () => {
            expectCompileError(`let x = 0xGG;`);
        });

        it("invalid binary digit error", () => {
            expectCompileError(`let x = 0b1012;`);
        });

        it("multiple decimal points error", () => {
            expectCompileError(`let x = 1.2.3;`);
        });

        it("trailing underscore in number error", () => {
            expectCompileError(`let x = 123_;`);
        });

        it("consecutive underscores in number error", () => {
            expectCompileError(`let x = 1__000;`);
        });

        it("leading decimal without integer error", () => {
            expectCompileError(`let x = .5;`);
        });

        it("trailing decimal without fraction error", () => {
            expectCompileError(`let x = 5.;`);
        });
    });

    describe("float literals", () => {
        it("basic float literal", () => {
            expectRunOutput(withOutput(`let x = 3.14;`, `String.fromFloat(x)`), "3.14");
        });

        it("scientific notation float", () => {
            expectRunOutput(withOutput(`let x = 1e10;`, `String.fromFloat(x)`), "10000000000");
        });

        it("scientific notation with negative exponent", () => {
            expectRunOutput(withOutput(`let x = 3.14e-2;`, `String.fromFloat(x)`), "0.0314");
        });
    });

    describe("string literals", () => {
        it("basic string literal", () => {
            expectRunOutput(withOutput(`let x = "hello";`, `x`), "hello");
        });

        it("string escape sequences", () => {
            expectRunOutput(withOutput(`let x = "line1\\nline2";`, `x`), "line1\nline2");
        });

        it("hex escape in string", () => {
            expectRunOutput(withOutput(`let x = "\\x41";`, `x`), "A");
        });

        it("unicode escape in string", () => {
            expectRunOutput(withOutput(`let x = "\\u03B1";`, `x`), "α");
        });

        it("long unicode escape in string", () => {
            expectRunOutput(withOutput(`let x = "\\u{1F600}";`, `x`), "\u{1F600}");
        });

        it("multi-line string literal", () => {
            expectCompiles(`let x = """hello
world""";`);
        });

        it("invalid escape sequence error", () => {
            expectCompileError(`let x = "\\q";`, "VF1");
        });

        it("unterminated string error", () => {
            expectCompileError(`let x = "unterminated`, "VF1");
        });

        it("incomplete hex escape error", () => {
            expectCompileError(`let x = "\\x4";`, "VF1");
        });

        it("incomplete unicode escape error", () => {
            expectCompileError(`let x = "\\u03";`, "VF1");
        });

        it("unterminated long unicode escape error", () => {
            expectCompileError(`let x = "\\u{12";`, "VF1");
        });

        it("out-of-range unicode escape error", () => {
            expectCompileError(`let x = "\\u{110000}";`, "VF1");
        });

        it("tab escape in string", () => {
            expectRunOutput(withOutput(`let x = "a\\tb";`, `x`), "a\tb");
        });

        it("backslash escape in string", () => {
            expectRunOutput(withOutput(`let x = "a\\\\b";`, `x`), "a\\b");
        });

        it("double quote escape in string", () => {
            expectRunOutput(withOutput(`let x = "say \\"hi\\"";`, `x`), 'say "hi"');
        });
    });

    describe("unit literal", () => {
        it("unit literal", () => {
            expectCompiles(`let x = ();`);
        });
    });

    describe("operators", () => {
        it("arithmetic operators compile", () => {
            expectCompiles(`let a = 1 + 2;
let b = 3 - 1;
let c = 2 * 3;
let d = 10 / 2;
let e = 7 % 3;`);
        });

        it("comparison operators compile", () => {
            expectCompiles(
                `let a = 1 == 2;
let b = 1 != 2;
let c = 1 < 2;
let d = 1 <= 2;
let e = 1 > 2;
let f = 1 >= 2;`,
            );
        });

        it("logical operators compile", () => {
            expectCompiles(`let a = true && false;
let b = true || false;
let c = !true;`);
        });

        it("string concatenation operator", () => {
            expectRunOutput(withOutput(`let x = "hello" & " " & "world";`, `x`), "hello world");
        });

        it("pipe operator", () => {
            expectRunOutput(
                withOutput(
                    `let double = (x: Int) => x * 2;
let result = 5 |> double;`,
                    `String.fromInt(result)`,
                ),
                "10",
            );
        });

        it("list cons operator", () => {
            expectCompiles(`let x = 1 :: [2, 3];`);
        });

        it("unary minus operator", () => {
            expectRunOutput(withOutput(`let x = -42;`, `String.fromInt(x)`), "-42");
        });

        it("composition operators compile", () => {
            expectCompiles(
                `let f = (x: Int) => x + 1;
let g = (x: Int) => x * 2;
let h = f >> g;
let i = f << g;`,
            );
        });

        it("reference operators compile", () => {
            expectCompiles(
                `let mut x = ref(0);
let y = !x;
x := 1;`,
            );
        });

        it("spread operator in list", () => {
            expectCompiles(
                `let xs = [1, 2];
let ys = [0, ...xs];`,
            );
        });
    });
});
