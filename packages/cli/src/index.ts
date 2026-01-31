#!/usr/bin/env node
/**
 * Vibefun CLI Entry Point
 *
 * Main CLI for the vibefun programming language compiler.
 */
import type { EmitType } from "./commands/index.js";

import { Command } from "commander";

import { compile, EXIT_USAGE_ERROR } from "./commands/index.js";

const program = new Command();

/**
 * Global options interface
 */
interface GlobalOptions {
    quiet?: boolean;
    verbose?: boolean;
    json?: boolean;
    color?: boolean;
    noColor?: boolean;
}

/**
 * Compile command options interface
 */
interface CompileCommandOptions {
    output?: string;
    emit?: EmitType;
}

program
    .name("vibefun")
    .description("Vibefun - A pragmatic functional programming language")
    .version("0.1.0")
    .option("-q, --quiet", "Suppress non-error output")
    .option("--verbose", "Verbose output (timing, phases, counts)")
    .option("--json", "Output diagnostics as JSON")
    .option("--color", "Force color output")
    .option("--no-color", "Disable color output");

program
    .command("compile")
    .description("Compile a .vf file to JavaScript")
    .argument("<file>", "Source file to compile")
    .option("-o, --output <path>", "Output file path")
    .option("-e, --emit <type>", "Output type: js, ast, typed-ast", "js")
    .action((file: string, cmdOptions: CompileCommandOptions) => {
        const globalOptions = program.opts<GlobalOptions>();

        // Validate emit option
        const emit = cmdOptions.emit;
        if (emit && !["js", "ast", "typed-ast"].includes(emit)) {
            console.error(`error: Invalid emit type '${emit}'. Valid options: js, ast, typed-ast`);
            process.exit(EXIT_USAGE_ERROR);
        }

        const result = compile(file, {
            ...(cmdOptions.output !== undefined ? { output: cmdOptions.output } : {}),
            ...(emit !== undefined && emit !== "js" ? { emit: emit as EmitType } : {}),
            ...(globalOptions.quiet === true ? { quiet: true } : {}),
            ...(globalOptions.verbose === true ? { verbose: true } : {}),
            ...(globalOptions.json === true ? { json: true } : {}),
            ...(globalOptions.color === true ? { color: true } : {}),
            ...(globalOptions.noColor === true ? { noColor: true } : {}),
        });

        // Output results
        if (result.stdout) {
            console.log(result.stdout);
        }
        if (result.stderr) {
            console.error(result.stderr);
        }

        process.exit(result.exitCode);
    });

// Stub commands for future implementation
program
    .command("check")
    .description("Type check a .vf file without compiling (not yet implemented)")
    .argument("<file>", "Source file to check")
    .action(() => {
        console.error("The 'check' command is not yet implemented.");
        process.exit(1);
    });

program
    .command("run")
    .description("Compile and run a .vf file (not yet implemented)")
    .argument("<file>", "Source file to run")
    .action(() => {
        console.error("The 'run' command is not yet implemented.");
        process.exit(1);
    });

// Handle unknown commands
program.on("command:*", () => {
    console.error(`error: Unknown command '${program.args[0]}'`);
    console.error("Run 'vibefun --help' for available commands.");
    process.exit(EXIT_USAGE_ERROR);
});

program.parse();
