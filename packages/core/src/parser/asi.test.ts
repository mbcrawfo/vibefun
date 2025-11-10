/**
 * Automatic Semicolon Insertion (ASI) Tests
 *
 * Tests ASI behavior including:
 * - Lambda + ASI interaction (newline before =>)
 * - Record context (ASI disabled inside records)
 * - Multi-line expressions
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import type { Module } from "../types/ast.js";
import { Parser } from "./parser.js";

function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Automatic Semicolon Insertion (ASI)", () => {
    describe("Basic ASI", () => {
        it("should insert semicolon after let binding on newline", () => {
            const module = parseModule(`
let x = 1
let y = 2
            `);
            expect(module.declarations).toHaveLength(2);
        });

        it("should not require explicit semicolons", () => {
            const module = parseModule(`
let a = 1
let b = 2
let c = 3
            `);
            expect(module.declarations).toHaveLength(3);
        });

        it("should allow explicit semicolons", () => {
            const module = parseModule(`
let a = 1;
let b = 2;
            `);
            expect(module.declarations).toHaveLength(2);
        });

        it("should handle mix of explicit and inserted semicolons", () => {
            const module = parseModule(`
let a = 1;
let b = 2
let c = 3;
let d = 4
            `);
            expect(module.declarations).toHaveLength(4);
        });
    });

    describe("Lambda + ASI Interaction", () => {
        it("should allow newline before => in lambda", () => {
            const module = parseModule(`
let f = (x, y)
=> x + y
            `);
            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Lambda");
        });

        it("should allow newline before => in single-param lambda", () => {
            const module = parseModule(`
let f = x
=> x + 1
            `);
            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Lambda");
        });

        it("should handle lambda with newline and multiple declarations", () => {
            const module = parseModule(`
let f = (x, y)
=> x + y
let g = (a, b)
=> a * b
            `);
            expect(module.declarations).toHaveLength(2);
        });

        it("should allow newline after => in lambda", () => {
            const module = parseModule(`
let f = (x, y) =>
  x + y
            `);
            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Lambda");
        });
    });

    describe("Record Context - ASI Disabled", () => {
        it("should NOT insert semicolon inside record literal", () => {
            const module = parseModule(`
let point = {
  x: 1
  y: 2
}
            `);
            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Record");
            if (decl.value.kind !== "Record") return;
            expect(decl.value.fields).toHaveLength(2);
        });

        it("should allow multiple fields on separate lines without semicolons", () => {
            const module = parseModule(`
let person = {
  name: "Alice"
  age: 30
  active: true
}
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Record");
            if (decl.value.kind !== "Record") return;
            expect(decl.value.fields).toHaveLength(3);
        });

        it("should handle record with shorthand fields on separate lines", () => {
            const module = parseModule(`
let config = {
  name
  age
  active
}
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Record");
            if (decl.value.kind !== "Record") return;
            expect(decl.value.fields).toHaveLength(3);
        });

        it("should handle record update with spread on separate lines", () => {
            const module = parseModule(`
let updated = {
  ...base
  name: "Bob"
  age: 25
}
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("RecordUpdate");
            if (decl.value.kind !== "RecordUpdate") return;
            expect(decl.value.updates.length).toBeGreaterThan(0);
        });

        it("should handle nested records without semicolons", () => {
            const module = parseModule(`
let nested = {
  outer: {
    inner: 42
    value: true
  }
  x: 1
}
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("Record");
        });
    });

    describe("Multi-line Expressions", () => {
        it("should handle multi-line binary operations", () => {
            const module = parseModule(`
let result = a + b
  + c
  + d
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle multi-line function calls", () => {
            const module = parseModule(`
let result = f(
  arg1,
  arg2,
  arg3
)
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle multi-line lists", () => {
            const module = parseModule(`
let list = [
  1,
  2,
  3
]
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("List");
        });

        it("should handle multi-line match expression", () => {
            const module = parseModule(`
let result = match x {
  | Some(v) => v
  | None => 0
}
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle multi-line if expression", () => {
            const module = parseModule(`
let result = if condition
  then value1
  else value2
            `);
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("ASI with Operators", () => {
        it("should not insert semicolon after binary operator", () => {
            const module = parseModule(`
let x = 1 +
  2
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should not insert semicolon after pipe operator", () => {
            const module = parseModule(`
let result = value |>
  transform
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should not insert semicolon after composition operator", () => {
            const module = parseModule(`
let composed = f >>
  g
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should not insert semicolon after cons operator", () => {
            const module = parseModule(`
let list = head ::
  tail
            `);
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("ASI with Method Chains", () => {
        it("should handle record access chains", () => {
            const module = parseModule(`
let value = obj
  .field1
  .field2
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle function call chains", () => {
            const module = parseModule(`
let result = f()
  (arg1)
  (arg2)
            `);
            expect(module.declarations).toHaveLength(1);
        });
    });

    describe("ASI Edge Cases", () => {
        it("should insert semicolon before closing brace", () => {
            const module = parseModule(`
let block = {
  let x = 1
  x + 1
}
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle ASI with trailing commas in lists", () => {
            const module = parseModule(`
let list = [
  1,
  2,
]
            `);
            const decl = module.declarations[0];
            if (!decl || decl.kind !== "LetDecl") throw new Error("Expected LetDecl");
            expect(decl.value.kind).toBe("List");
        });

        it("should handle empty lines between declarations", () => {
            const module = parseModule(`
let a = 1

let b = 2

let c = 3
            `);
            expect(module.declarations).toHaveLength(3);
        });

        it("should handle ASI with comments", () => {
            const module = parseModule(`
let x = 1 // comment
let y = 2
            `);
            expect(module.declarations).toHaveLength(2);
        });
    });

    describe("ASI with Blocks", () => {
        it("should insert semicolons in block expressions", () => {
            const module = parseModule(`
let result = {
  let x = 1
  let y = 2
  x + y
}
            `);
            expect(module.declarations).toHaveLength(1);
        });

        it("should handle nested blocks with ASI", () => {
            const module = parseModule(`
let result = {
  let x = {
    let a = 1
    a + 1
  }
  x * 2
}
            `);
            expect(module.declarations).toHaveLength(1);
        });
    });
});
