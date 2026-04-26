import * as fc from "fast-check";

const DEFAULT_SEED = 0x56464242; // "VFBB" — fixed seed for deterministic CI runs.
const DEFAULT_NUM_RUNS = 100;

const envSeed = process.env["FC_SEED"];
const envNumRuns = process.env["FC_NUM_RUNS"];

const seed = envSeed === undefined || envSeed === "random" ? DEFAULT_SEED : Number.parseInt(envSeed, 10);

const numRuns = envNumRuns === undefined ? DEFAULT_NUM_RUNS : Number.parseInt(envNumRuns, 10);

fc.configureGlobal({
    seed: envSeed === "random" ? Date.now() : seed,
    numRuns: Number.isFinite(numRuns) ? numRuns : DEFAULT_NUM_RUNS,
    verbose: fc.VerbosityLevel.Verbose,
});
