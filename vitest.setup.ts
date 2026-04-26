import * as fc from "fast-check";

const DEFAULT_SEED = 0x56464242; // "VFBB" — fixed seed for deterministic CI runs.
const DEFAULT_NUM_RUNS = 100;

const envSeed = process.env["FC_SEED"];
const envNumRuns = process.env["FC_NUM_RUNS"];

// Validate parsed env values before forwarding to fast-check. fast-check
// does not validate seed/numRuns; passing NaN, zero, or a negative numRuns
// silently produces meaningless runs (e.g. numRuns=0 marks success without
// running any property), which would let CI go green on a broken setup.
const parsedSeed = envSeed === undefined || envSeed === "random" ? DEFAULT_SEED : Number.parseInt(envSeed, 10);
const seed = Number.isSafeInteger(parsedSeed) ? parsedSeed : DEFAULT_SEED;

const parsedNumRuns = envNumRuns === undefined ? DEFAULT_NUM_RUNS : Number.parseInt(envNumRuns, 10);
const numRuns = Number.isSafeInteger(parsedNumRuns) && parsedNumRuns > 0 ? parsedNumRuns : DEFAULT_NUM_RUNS;

fc.configureGlobal({
    seed: envSeed === "random" ? Date.now() : seed,
    numRuns,
    verbose: fc.VerbosityLevel.Verbose,
});
