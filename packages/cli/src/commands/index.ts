/**
 * CLI commands
 */

export {
    compile,
    compilePipeline,
    isStdinInput,
    STDIN_FILENAME,
    type CompileOptions,
    type CompileResult,
    type EmitType,
    type PipelineError,
    type PipelineResult,
    type PipelineSuccess,
    type PipelineEmit,
} from "./compile.js";
export {
    EXIT_SUCCESS,
    EXIT_COMPILATION_ERROR,
    EXIT_USAGE_ERROR,
    EXIT_IO_ERROR,
    EXIT_INTERNAL_ERROR,
} from "./compile.js";

export { run, type RunOptions, type RunResult } from "./run.js";
