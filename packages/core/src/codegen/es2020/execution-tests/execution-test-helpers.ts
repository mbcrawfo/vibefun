/**
 * Execution test helpers for ES2020 code generator
 *
 * Uses Node's `vm` module for sandboxed execution of generated JavaScript.
 * This allows us to verify runtime semantics without executing untrusted code
 * in the main process.
 */

import vm from "node:vm";

import { desugarModule } from "../../../desugarer/index.js";
import { Lexer } from "../../../lexer/index.js";
import { Parser } from "../../../parser/index.js";
import { typeCheck } from "../../../typechecker/index.js";
import { generate } from "../../index.js";

/**
 * Compile vibefun source through the full pipeline.
 *
 * @param source - Vibefun source code
 * @returns The generated JavaScript code
 */
function compile(source: string): string {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const ast = parser.parse();
    const coreModule = desugarModule(ast);
    const typedModule = typeCheck(coreModule);
    const { code } = generate(typedModule, { filename: "test.vf" });
    return code;
}

/**
 * Strip the export statement from generated code for vm execution.
 * ES modules exports are not supported in vm.runInContext().
 */
function stripExports(code: string): string {
    // Generated code ends with `export { name1, name2 };`
    return code.replace(/^export\s*\{[^}]*\}\s*;\s*$/m, "");
}

/**
 * Compile vibefun source and execute in a sandboxed VM context.
 *
 * @param source - Vibefun source code
 * @param resultExpr - Optional expression to evaluate for the result
 * @returns The result of evaluating resultExpr, or undefined
 */
export function compileAndRun(source: string, resultExpr?: string): unknown {
    // Strip export statement for vm execution
    const executableCode = stripExports(compile(source));

    // Execute in sandboxed context
    const context = vm.createContext({
        // Provide globals needed by generated code
        Math,
        Array,
        Object,
        String,
        Number,
        Boolean,
        JSON,
        Error,
        Map,
        Set,
        RegExp,
        Infinity,
        NaN,
        undefined,
        console, // For debugging
    });

    // Run generated code - declarations become available in context
    vm.runInContext(executableCode, context);

    // If resultExpr provided, evaluate it
    if (resultExpr) {
        return vm.runInContext(resultExpr, context);
    }
    return undefined;
}

/**
 * Compile and run, expecting a specific named export as result.
 *
 * @param source - Vibefun source code
 * @param exportName - Name of the export to retrieve
 * @returns The value of the named export
 */
export function compileAndGetExport(source: string, exportName: string): unknown {
    return compileAndRun(source, exportName);
}

/**
 * Helper to compile and check if the generated code runs without errors.
 *
 * @param source - Vibefun source code
 * @returns true if execution succeeded
 */
export function compileAndRunSucceeds(source: string): boolean {
    try {
        compileAndRun(source);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the generated JavaScript code for inspection/debugging.
 *
 * @param source - Vibefun source code
 * @returns The generated JavaScript code
 */
export function compileToJs(source: string): string {
    return compile(source);
}
