import type { Module } from "@vibefun/core";

import { Lexer, Parser } from "@vibefun/core";
import { describe, expect, it } from "vitest";

import { countNodes, serializeSurfaceAst, serializeTypedAst } from "./ast-json.js";

/**
 * Parse source code to a module
 */
function parse(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("countNodes", () => {
    it("should count empty module as 1", () => {
        const module = parse("");
        expect(countNodes(module)).toBe(1);
    });

    it("should count declarations", () => {
        const module = parse("let x = 42;");
        // Module (1) + 1 declaration = 2
        expect(countNodes(module)).toBe(2);
    });

    it("should count multiple declarations", () => {
        const module = parse("let x = 1;\nlet y = 2;\nlet z = 3;");
        const count = countNodes(module);
        // 1 (module) + 3 declarations = 4
        expect(count).toBe(4);
    });
});

describe("serializeSurfaceAst", () => {
    it("should produce valid JSON", () => {
        const module = parse("let x = 42;");
        const output = serializeSurfaceAst(module, "test.vf");

        expect(() => JSON.parse(output)).not.toThrow();
    });

    it("should include filename", () => {
        const module = parse("let x = 42;");
        const output = serializeSurfaceAst(module, "main.vf");
        const parsed = JSON.parse(output);

        expect(parsed.filename).toBe("main.vf");
    });

    it("should include declaration count", () => {
        const module = parse("let x = 42;");
        const output = serializeSurfaceAst(module, "test.vf");
        const parsed = JSON.parse(output);

        expect(parsed.declarationCount).toBe(1);
    });

    it("should include AST structure", () => {
        const module = parse("let x = 42;");
        const output = serializeSurfaceAst(module, "test.vf");
        const parsed = JSON.parse(output);

        expect(parsed.ast).toBeDefined();
        expect(parsed.ast.declarations).toHaveLength(1);
        expect(parsed.ast.declarations[0].kind).toBe("LetDecl");
    });

    it("should serialize multiple declarations", () => {
        const module = parse("let add = (x, y) => x + y;\nlet result = add(1, 2);");
        const output = serializeSurfaceAst(module, "test.vf");
        const parsed = JSON.parse(output);

        expect(parsed.ast.declarations).toHaveLength(2);
    });
});

describe("serializeTypedAst", () => {
    it("should produce valid JSON", () => {
        // Create a minimal typed module
        const typedModule = {
            module: {
                imports: [],
                declarations: [],
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            },
            env: { values: new Map(), types: new Map() },
            declarationTypes: new Map<string, { type: string; name: string }>([["x", { type: "Const", name: "Int" }]]),
        };

        // @ts-expect-error - TypedModule type is more complex but this works for testing
        const output = serializeTypedAst(typedModule, "test.vf");

        expect(() => JSON.parse(output)).not.toThrow();
    });

    it("should include types as formatted strings", () => {
        const typedModule = {
            module: {
                imports: [],
                declarations: [],
                loc: { file: "test.vf", line: 1, column: 1, offset: 0 },
            },
            env: { values: new Map(), types: new Map() },
            declarationTypes: new Map([
                ["x", { type: "Const", name: "Int" }],
                ["y", { type: "Const", name: "String" }],
            ]),
        };

        // @ts-expect-error - simplified for testing
        const output = serializeTypedAst(typedModule, "test.vf");
        const parsed = JSON.parse(output);

        expect(parsed.types.x).toBe("Int");
        expect(parsed.types.y).toBe("String");
    });
});
