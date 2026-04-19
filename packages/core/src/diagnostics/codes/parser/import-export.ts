/**
 * Import/Export Parsing Errors (VF2400-VF2499)
 */

import type { DiagnosticDefinition } from "../../diagnostic.js";

export const VF2400: DiagnosticDefinition = {
    code: "VF2400",
    title: "ExpectedImportSpecifier",
    messageTemplate: "Expected '{' or '*' after 'import'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Use: import { name } from "module" or import * as Name from "module"',
    explanation:
        "Import declarations must specify what to import using either named imports " +
        "(with braces) or namespace imports (with *). Bare imports are not supported.",
    example: {
        bad: 'import foo from "module"',
        good: 'import { foo } from "module"',
        description: "Used named import syntax with braces",
    },
    relatedCodes: ["VF2401", "VF2402"],
};

export const VF2401: DiagnosticDefinition = {
    code: "VF2401",
    title: "ExpectedExportSpecifier",
    messageTemplate: "Expected '{' or '*' after 'export'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Use: export { name } from "module" or export * from "module"',
    explanation:
        "Re-export declarations must specify what to export using either named exports " +
        "(with braces) or namespace exports (with *).",
    example: {
        bad: 'export foo from "module"',
        good: 'export { foo } from "module"',
        description: "Used named export syntax with braces",
    },
    relatedCodes: ["VF2400", "VF2402"],
};

export const VF2402: DiagnosticDefinition = {
    code: "VF2402",
    title: "ExpectedFromKeyword",
    messageTemplate: "Expected 'from' keyword",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Add "from" followed by the module path: from "module-path"',
    explanation:
        "Import and re-export declarations require the 'from' keyword followed by " +
        "the module path as a string literal.",
    example: {
        bad: 'import { foo } "module"',
        good: 'import { foo } from "module"',
        description: "Added 'from' keyword before module path",
    },
    relatedCodes: ["VF2400", "VF2403"],
};

export const VF2403: DiagnosticDefinition = {
    code: "VF2403",
    title: "ExpectedModulePath",
    messageTemplate: "Expected module path string",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Provide the module path as a string: from "path/to/module"',
    explanation:
        "The 'from' keyword must be followed by a string literal containing the module path. " +
        "Module paths can be relative (starting with ./ or ../) or package names.",
    example: {
        bad: "import { foo } from module",
        good: 'import { foo } from "./module"',
        description: "Used string literal for module path",
    },
    relatedCodes: ["VF2402"],
};

export const VF2404: DiagnosticDefinition = {
    code: "VF2404",
    title: "ExpectedAsAfterStar",
    messageTemplate: "Expected 'as' after '*'",
    severity: "error",
    phase: "parser",
    category: "import",
    hintTemplate: 'Namespace imports require an alias: import * as Name from "module"',
    explanation:
        "When using namespace imports (import *), you must provide an alias using 'as'. " +
        "This alias becomes the namespace through which all exports are accessed.",
    example: {
        bad: 'import * from "module"',
        good: 'import * as Module from "module"',
        description: "Added 'as Module' to provide namespace alias",
    },
    relatedCodes: ["VF2400"],
};

export const importExportCodes: readonly DiagnosticDefinition[] = [VF2400, VF2401, VF2402, VF2403, VF2404];
