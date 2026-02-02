import type { GenerateResult } from "../../index.js";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { desugarModule } from "../../../desugarer/index.js";
import { Lexer } from "../../../lexer/index.js";
import { Parser } from "../../../parser/index.js";
import { typeCheck } from "../../../typechecker/index.js";
import { generate } from "../generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compile a .vf fixture file to JavaScript
 *
 * @param filename - The fixture filename (e.g., "expressions.vf")
 * @returns The generated JavaScript code
 */
export function compileFixture(filename: string): GenerateResult {
    const fixturePath = join(__dirname, filename);
    const source = readFileSync(fixturePath, "utf-8");

    // Full compilation pipeline
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filename);
    const ast = parser.parse();
    const coreModule = desugarModule(ast);
    const typedModule = typeCheck(coreModule);

    return generate(typedModule, { filename });
}
