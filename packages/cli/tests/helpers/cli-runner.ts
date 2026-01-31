/**
 * CLI test runner utility
 */

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { resolve } from "node:path";

/** Path to the CLI binary */
export const CLI_PATH = resolve(__dirname, "../../dist/index.js");

/** Result from running the CLI */
export interface CliResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/** Options for runCli */
export interface RunCliOptions {
    cwd?: string;
    env?: Record<string, string>;
}

/**
 * Run the CLI with given arguments
 */
export function runCli(args: string[], options: RunCliOptions = {}): CliResult {
    const result = spawnSync("node", [CLI_PATH, ...args], {
        cwd: options.cwd,
        encoding: "utf-8",
        env: { ...process.env, ...options.env, NO_COLOR: "1" },
    });

    return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.status ?? -1,
    };
}

/**
 * Run a Node.js script (for testing generated output)
 */
export function runNode(scriptPath: string): SpawnSyncReturns<string> {
    return spawnSync("node", [scriptPath], {
        encoding: "utf-8",
    });
}
