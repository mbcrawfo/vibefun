#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Lexer, Parser, VibefunDiagnostic } from "@vibefun/core";
import { Command } from "commander";

const program = new Command();

program.name("vibefun").description("Vibefun - A pragmatic functional programming language").version("0.1.0");

/**
 * Format and display a compilation error.
 * Uses VibefunDiagnostic.format() for structured errors with source context.
 */
function displayError(error: unknown, source: string): void {
    if (error instanceof VibefunDiagnostic) {
        // Use the unified diagnostic formatting with source context
        console.error(error.format(source));
    } else if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
    } else {
        console.error(error);
    }
}

program
    .command("compile")
    .description("Compile a .vf file to JavaScript")
    .argument("<file>", "Source file to compile")
    .option("-o, --output <file>", "Output file")
    .action((file: string, options: { output?: string }) => {
        let source = "";
        try {
            console.log(`Compiling ${file}...`);

            source = readFileSync(file, "utf-8");
            const lexer = new Lexer(source, file);
            const tokens = lexer.tokenize();

            console.log(`✓ Lexer: ${tokens.length} tokens`);

            const parser = new Parser(tokens, file);
            const ast = parser.parse();

            console.log(`✓ Parser: ${ast.declarations.length} declarations`);

            if (options.output) {
                console.log(`Output would be written to: ${options.output}`);
            }

            console.log("\n⚠️  Code generation not yet implemented");
            console.log("The lexer and parser are complete, but transpilation is TODO.");
        } catch (error) {
            console.error("Compilation failed:");
            displayError(error, source);
            process.exit(1);
        }
    });

program
    .command("check")
    .description("Type check a .vf file without compiling")
    .argument("<file>", "Source file to check")
    .action((file: string) => {
        let source = "";
        try {
            console.log(`Type checking ${file}...`);

            source = readFileSync(file, "utf-8");
            const lexer = new Lexer(source, file);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, file);
            const ast = parser.parse();

            console.log(`✓ Syntax valid: ${ast.declarations.length} declarations`);
            console.log("\n⚠️  Type checker not yet implemented");
        } catch (error) {
            console.error("Type checking failed:");
            displayError(error, source);
            process.exit(1);
        }
    });

program
    .command("run")
    .description("Compile and run a .vf file")
    .argument("<file>", "Source file to run")
    .action((file: string) => {
        console.log(`Running ${file}...`);
        console.log("⚠️  Not yet implemented");
        process.exit(1);
    });

program.parse();
