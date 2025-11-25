import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

describe("Semicolon Requirements", () => {
    function parse(source: string) {
        const lexer = new Lexer(source, "test.vf");
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, "test.vf");
        return parser.parse();
    }

    describe("Top-level declarations", () => {
        it("should require semicolons after let declarations", () => {
            expect(() => parse("let x = 1")).toThrow(VibefunDiagnostic);
            expect(() => parse("let x = 1\nlet y = 2")).toThrow(VibefunDiagnostic);
        });

        it("should require semicolons after type declarations", () => {
            expect(() => parse("type Point = { x: Int, y: Int }")).toThrow(VibefunDiagnostic);
        });

        it("should require semicolons after external declarations", () => {
            expect(() => parse('external log: (String) -> Unit = "console.log"')).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons at EOF", () => {
            expect(() => parse("let x = 1;")).not.toThrow();
            expect(() => parse("let x = 1;\nlet y = 2;")).not.toThrow();
        });
    });

    describe("Block expressions", () => {
        it("should require semicolons between statements", () => {
            expect(() => parse("let x = { let y = 1\ny };")).toThrow(VibefunDiagnostic);
            expect(() => parse("let x = { 1\n2 };")).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in blocks", () => {
            expect(() => parse("let x = { let y = 1; y; };")).not.toThrow();
            expect(() => parse("let x = { 1; 2; };")).not.toThrow();
        });

        it("should accept empty blocks", () => {
            expect(() => parse("let noOp = () => {};")).not.toThrow();
        });
    });

    describe("External blocks", () => {
        it("should require semicolons between external items", () => {
            expect(() =>
                parse('external { log: (String) -> Unit = "console.log"\nerror: (String) -> Unit = "console.error" };'),
            ).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in external blocks", () => {
            expect(() =>
                parse(
                    'external { log: (String) -> Unit = "console.log"; error: (String) -> Unit = "console.error"; };',
                ),
            ).not.toThrow();
        });
    });

    describe("Match expressions with block bodies", () => {
        it("should require semicolons in match case blocks", () => {
            expect(() =>
                parse(`
                    let x = match Some(42) {
                        | Some(v) => { let y = v\ny + 1 }
                        | None => 0
                    };
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in match case blocks", () => {
            expect(() =>
                parse(`
                    let x = match Some(42) {
                        | Some(v) => { let y = v; y + 1; }
                        | None => 0
                    };
                `),
            ).not.toThrow();
        });

        it("should handle nested match expressions", () => {
            expect(() =>
                parse(`
                    let x = match outer {
                        | Some(v) => match v {
                            | Ok(inner) => { let result = inner; result; }
                            | Err(_) => 0
                        }
                        | None => 0
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("If-then-else with block bodies", () => {
        it("should require semicolons in if-then blocks", () => {
            expect(() =>
                parse(`
                    let x = if true then { let y = 1\ny } else 0;
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in if-then blocks", () => {
            expect(() =>
                parse(`
                    let x = if true then { let y = 1; y; } else 0;
                `),
            ).not.toThrow();
        });

        it("should require semicolons in if-else blocks", () => {
            expect(() =>
                parse(`
                    let x = if false then 1 else { let y = 2\ny };
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should handle if-then-else-if chains", () => {
            expect(() =>
                parse(`
                    let x = if a then { let x = 1; x; }
                            else if b then { let y = 2; y; }
                            else { let z = 3; z; };
                `),
            ).not.toThrow();
        });
    });

    describe("While loops with blocks", () => {
        it("should require semicolons in while body blocks", () => {
            expect(() =>
                parse(`
                    let x = while true { let i = 0\ni };
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in while body blocks", () => {
            expect(() =>
                parse(`
                    let x = while true { let i = 0; i; };
                `),
            ).not.toThrow();
        });

        it("should accept empty while blocks", () => {
            expect(() => parse("let x = while true {};")).not.toThrow();
        });

        it("should handle nested blocks in while loops", () => {
            expect(() =>
                parse(`
                    let x = while condition {
                        if check then { let temp = 1; temp; };
                        result;
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Lambda block bodies", () => {
        it("should require semicolons in lambda blocks", () => {
            expect(() =>
                parse(`
                    let f = (x) => { let y = x + 1\ny * 2 };
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should accept semicolons in lambda blocks", () => {
            expect(() =>
                parse(`
                    let f = (x) => { let y = x + 1; y * 2; };
                `),
            ).not.toThrow();
        });

        it("should handle nested lambdas with blocks", () => {
            expect(() =>
                parse(`
                    let f = (x) => (y) => { let sum = x + y; sum * 2; };
                `),
            ).not.toThrow();
        });

        it("should handle lambda returning block expression", () => {
            expect(() =>
                parse(`
                    let makeAdder = (n) => {
                        let adder = (x) => { let result = x + n; result; };
                        adder;
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Lambda newline exception", () => {
        it("should allow newlines before fat arrow with multiple params", () => {
            expect(() =>
                parse(`
                    let f = (x, y)
                    => x + y;
                `),
            ).not.toThrow();
        });

        it("should allow newlines before fat arrow with single param", () => {
            expect(() =>
                parse(`
                    let f = x
                    => x + 1;
                `),
            ).not.toThrow();
        });

        it("should allow newlines after closing paren before arrow", () => {
            expect(() =>
                parse(`
                    let f = (x, y, z)
                    => x + y + z;
                `),
            ).not.toThrow();
        });
    });

    describe("Records vs blocks disambiguation", () => {
        it("should recognize blocks with semicolons", () => {
            expect(() => parse("let x = { y; };")).not.toThrow();
        });

        it("should recognize records without semicolons", () => {
            expect(() => parse("let x = { y };")).not.toThrow();
        });

        it("should recognize records with colons", () => {
            expect(() => parse("let x = { y: 42 };")).not.toThrow();
        });

        it("should recognize records with commas", () => {
            expect(() => parse("let x = { a: 1, b: 2 };")).not.toThrow();
        });

        it("should require commas between record fields", () => {
            expect(() =>
                parse(`
                    let x = {
                        a: 1
                        b: 2
                    };
                `),
            ).toThrow(/VF2110/);
        });
    });

    describe("Operator sections and type annotations", () => {
        it("should handle type annotations with semicolons", () => {
            expect(() => parse("let x: Int = 1;")).not.toThrow();
        });

        it("should handle complex type annotations", () => {
            expect(() => parse("let f: (Int, Int) -> Int = (x, y) => x + y;")).not.toThrow();
        });

        it("should handle type annotations in blocks", () => {
            expect(() =>
                parse(`
                    let x = {
                        let y: Int = 42;
                        y + 1;
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Pipe operators and multi-line expressions", () => {
        it("should allow pipe operator continuation", () => {
            expect(() =>
                parse(`
                    let result = data
                        |> filter((x) => x > 0)
                        |> map((x) => x * 2);
                `),
            ).not.toThrow();
        });

        it("should require semicolon at end of pipe chain", () => {
            expect(() =>
                parse(`
                    let result = data
                        |> filter((x) => x > 0)
                        |> map((x) => x * 2)
                `),
            ).toThrow(VibefunDiagnostic);
        });

        it("should allow binary operators for line continuation", () => {
            expect(() =>
                parse(`
                    let result = x + y +
                                 z + w;
                `),
            ).not.toThrow();
        });

        it("should allow multi-line expressions in blocks", () => {
            expect(() =>
                parse(`
                    let x = {
                        let result = a + b +
                                     c + d;
                        result;
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Deep nesting scenarios", () => {
        it("should handle blocks within match within blocks", () => {
            expect(() =>
                parse(`
                    let f = (opt) => {
                        let result = match opt {
                            | Some(v) => {
                                let processed = v * 2;
                                processed + 1;
                            }
                            | None => 0
                        };
                        result;
                    };
                `),
            ).not.toThrow();
        });

        it("should handle deeply nested blocks", () => {
            expect(() =>
                parse(`
                    let x = {
                        let y = {
                            let z = {
                                let w = 42;
                                w;
                            };
                            z;
                        };
                        y;
                    };
                `),
            ).not.toThrow();
        });

        it("should handle mixed record and block contexts", () => {
            expect(() =>
                parse(`
                    let config = {
                        handler: (x) => {
                            let processed = x * 2;
                            processed;
                        },
                        data: { value: 42 }
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Error recovery", () => {
        it("should report errors for missing semicolons", () => {
            try {
                parse("let x = 1\nlet y = 2");
                expect.fail("Should have thrown VibefunDiagnostic");
            } catch (error) {
                expect(error).toBeInstanceOf(VibefunDiagnostic);
                expect((error as VibefunDiagnostic).message).toContain("VF2107");
            }
        });

        it("should provide helpful error messages for blocks", () => {
            try {
                parse("let x = { let y = 1\ny }");
                expect.fail("Should have thrown VibefunDiagnostic");
            } catch (error) {
                expect(error).toBeInstanceOf(VibefunDiagnostic);
                expect((error as VibefunDiagnostic).message).toContain("VF2107");
            }
        });

        it("should provide helpful error messages for external blocks", () => {
            try {
                parse('external { log: (String) -> Unit = "console.log"\nerror: (String) -> Unit = "console.error" }');
                expect.fail("Should have thrown VibefunDiagnostic");
            } catch (error) {
                expect(error).toBeInstanceOf(VibefunDiagnostic);
                expect((error as VibefunDiagnostic).message).toContain("VF2007");
            }
        });
    });

    describe("Comments after semicolons", () => {
        it("should allow single-line comments after semicolons", () => {
            expect(() => parse("let x = 1; // comment")).not.toThrow();
        });

        it("should allow multi-line comments after semicolons", () => {
            expect(() => parse("let x = 1; /* comment */")).not.toThrow();
        });

        it("should allow comments in blocks", () => {
            expect(() =>
                parse(`
                    let x = {
                        let y = 1; // first
                        let z = 2; /* second */
                        y + z; // result
                    };
                `),
            ).not.toThrow();
        });
    });

    describe("Edge cases", () => {
        it("should handle single statement blocks", () => {
            expect(() => parse("let x = { 42; };")).not.toThrow();
        });

        it("should handle trailing semicolons in blocks", () => {
            expect(() => parse("let x = { let y = 1; y; };")).not.toThrow();
        });

        it("should handle multiple declarations with semicolons", () => {
            expect(() => parse("let x = 1; let y = 2; let z = 3;")).not.toThrow();
        });

        it("should handle semicolons with various whitespace", () => {
            expect(() =>
                parse(`
                    let x = 1   ;
                    let y = 2;
                    let z = 3		;
                `),
            ).not.toThrow();
        });

        it("should handle records with trailing comma", () => {
            expect(() => parse("let x = { a: 1, b: 2, };")).not.toThrow();
        });
    });
});
