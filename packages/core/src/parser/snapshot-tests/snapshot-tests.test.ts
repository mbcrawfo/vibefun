import type { Module } from "../../types/ast.js";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { Lexer } from "../../lexer/index.js";
import { Parser } from "../parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to parse a .vf fixture file into an AST
 * @param filename - Name of the .vf file in the fixtures directory
 * @returns Parsed Module AST
 */
function parseSnapshot(filename: string): Module {
    const fixturePath = join(__dirname, "fixtures", filename);
    const source = readFileSync(fixturePath, "utf-8");
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filename);
    return parser.parse();
}

describe("Parser Snapshots - Declarations", () => {
    it("should parse declarations.vf", () => {
        const ast = parseSnapshot("declarations.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Expressions", () => {
    it("should parse expressions.vf", () => {
        const ast = parseSnapshot("expressions.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Patterns", () => {
    it("should parse patterns.vf", () => {
        const ast = parseSnapshot("patterns.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Functions", () => {
    it("should parse functions.vf", () => {
        const ast = parseSnapshot("functions.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Data Structures", () => {
    it("should parse data-structures.vf", () => {
        const ast = parseSnapshot("data-structures.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Control Flow", () => {
    it("should parse control-flow.vf", () => {
        const ast = parseSnapshot("control-flow.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Modules", () => {
    it("should parse modules.vf", () => {
        const ast = parseSnapshot("modules.vf");
        expect(ast).toMatchSnapshot();
    });
});

describe("Parser Snapshots - Real World", () => {
    it("should parse real-world.vf", () => {
        const ast = parseSnapshot("real-world.vf");
        expect(ast).toMatchSnapshot();
    });
});
