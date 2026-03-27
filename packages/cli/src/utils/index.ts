/**
 * CLI utility modules
 */

export { Timer, formatDuration, formatBytes } from "./timer.js";
export type { PhaseTiming, PhaseTimings } from "./timer.js";

export { shouldUseColor, createColors } from "./colors.js";
export type { ColorOptions, ColorFunctions } from "./colors.js";

export { stripBom, normalizeLineEndings, readSourceFile, readStdin, writeAtomic, isNodeError } from "./file-io.js";

export { formatFsErrorMessage } from "./format-fs-error.js";
export type { ReadResult } from "./file-io.js";
