/**
 * Parser integration tests - pattern matching and complex expressions
 */

import { describe, expect, it } from "vitest";

import { parseModule } from "./parser-test-helpers.js";

describe("Parser - Integration - Pattern Matching and Complex Expressions", () => {
    describe("pattern matching programs", () => {
        it("parses list sum with pattern matching", () => {
            const source = `
                let rec sum = (list) => match list {
                    | [] => 0
                    | [head, ...tail] => head + sum(tail)
                };
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                recursive: true,
                value: {
                    kind: "Lambda",
                    body: {
                        kind: "Match",
                        cases: [
                            { pattern: { kind: "ListPattern", elements: [] } },
                            {
                                pattern: {
                                    kind: "ListPattern",
                                    elements: [{ kind: "VarPattern" }],
                                },
                            },
                        ],
                    },
                },
            });
        });

        it("parses nested pattern matching", () => {
            const source = `
                let processResult = (result) => match result {
                    | Ok(Some(value)) => value
                    | Ok(None()) => 0
                    | Err(_) => -1
                };
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0]!;
            expect(decl).toBeDefined();
            expect(decl.kind).toBe("LetDecl");
            if (decl.kind === "LetDecl" && decl.value.kind === "Lambda") {
                const body = decl.value.body;
                expect(body.kind).toBe("Match");
                if (body.kind === "Match") {
                    expect(body.cases).toHaveLength(3);
                    expect(body.cases[0]).toBeDefined();
                    expect(body.cases[0]!.pattern.kind).toBe("ConstructorPattern");
                    expect(body.cases[1]).toBeDefined();
                    expect(body.cases[1]!.pattern.kind).toBe("ConstructorPattern");
                    expect(body.cases[2]).toBeDefined();
                    expect(body.cases[2]!.pattern.kind).toBe("ConstructorPattern");
                }
            }
        });

        it("parses record destructuring in let binding", () => {
            const source = `
                let { x, y } = point;
                let distance = x * x + y * y;
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                pattern: {
                    kind: "RecordPattern",
                    fields: [{ name: "x" }, { name: "y" }],
                },
            });
        });
    });

    describe("complex expressions in programs", () => {
        it("parses pipe operator chains", () => {
            const source = "let result = data |> filter((x) => x > 0) |> map((x) => x * 2) |> sum;";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0]!;
            expect(decl).toBeDefined();
            expect(decl.kind).toBe("LetDecl");
            if (decl.kind === "LetDecl") {
                expect(decl.value.kind).toBe("Pipe");
            }
        });

        it("parses record construction and update", () => {
            const source = `
                let point = { x: 10, y: 20 };
                let movedPoint = { ...point, x: point.x + 5 };
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "Record" },
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "RecordUpdate" },
            });
        });

        it("parses list operations", () => {
            const source = `
                let numbers = [1, 2, 3, 4, 5];
                let moreNumbers = 0 :: numbers;
                let firstThree = [1, 2, 3];
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "List" },
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "BinOp", op: "Cons" },
            });
        });
    });
});
