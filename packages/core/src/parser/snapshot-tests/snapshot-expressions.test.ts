import type { Module } from "../../types/ast.js";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { Lexer } from "../../lexer/index.js";
import { Parser } from "../parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseFixture(filename: string): Module {
    const fixturePath = join(__dirname, filename);
    const source = readFileSync(fixturePath, "utf-8");
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filename);
    return parser.parse();
}

describe("Parser Snapshot - Expressions", () => {
    it("should parse expressions.vf", () => {
        const ast = parseFixture("expressions.vf");
        expect(ast).toMatchSnapshot();
    });
});
