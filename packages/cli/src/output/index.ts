/**
 * CLI output modules
 */

export { toJsonDiagnostic, formatDiagnosticHuman, formatDiagnosticsJson, formatSuccessJson } from "./diagnostic.js";
export type { JsonDiagnostic, JsonOutput } from "./diagnostic.js";

export { serializeSurfaceAst, serializeTypedAst, countNodes } from "./ast-json.js";
export type { AstOutput, TypedAstOutput } from "./ast-json.js";
