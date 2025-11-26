/**
 * Module system diagnostic codes (VF5xxx)
 *
 * Error codes for the module resolution and import/export phase.
 *
 * Subcategory allocation:
 * - VF5000-VF5099: Import resolution errors
 * - VF5100-VF5199: Export validation errors
 * - VF5200-VF5299: Dependency errors (reserved)
 * - VF5900-VF5999: Module warnings
 */

import type { DiagnosticDefinition } from "../diagnostic.js";

import { registry } from "../registry.js";

// =============================================================================
// VF5000-VF5099: Import Resolution Errors
// =============================================================================

export const VF5000: DiagnosticDefinition = {
    code: "VF5000",
    title: "ModuleNotFound",
    messageTemplate: "Module '{path}' not found",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Check that the module path is correct and the file exists",
    explanation:
        "The import statement references a module that could not be found. " +
        "This can happen if the file path is incorrect, the file doesn't exist, " +
        "or the module name is misspelled.",
    example: {
        bad: 'import { foo } from "./utills"',
        good: 'import { foo } from "./utils"',
        description: 'Fixed typo in module path: "utills" → "utils"',
    },
    relatedCodes: ["VF5001", "VF5002"],
};

export const VF5001: DiagnosticDefinition = {
    code: "VF5001",
    title: "ImportNotExported",
    messageTemplate: "'{name}' is not exported from module '{path}'",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Check the module's exports or add the export declaration",
    explanation:
        "The import statement tries to import a name that is not exported from the target module. " +
        "Either the name is misspelled, or the target module doesn't export this binding.",
    example: {
        bad: 'import { helpr } from "./utils"',
        good: 'import { helper } from "./utils"',
        description: 'Fixed typo in import name: "helpr" → "helper"',
    },
    relatedCodes: ["VF5000", "VF5100"],
};

export const VF5002: DiagnosticDefinition = {
    code: "VF5002",
    title: "DuplicateImport",
    messageTemplate: "'{name}' is already imported",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Remove the duplicate import or use an alias",
    explanation:
        "The same name is imported multiple times. Each imported name must be unique within a module. " +
        "Use aliasing (as newName) if you need to import identically named exports from different modules.",
    example: {
        bad: 'import { foo } from "./a"\nimport { foo } from "./b"',
        good: 'import { foo } from "./a"\nimport { foo as fooB } from "./b"',
        description: "Used alias to avoid duplicate import name",
    },
    relatedCodes: ["VF5003"],
};

export const VF5003: DiagnosticDefinition = {
    code: "VF5003",
    title: "ImportShadowed",
    messageTemplate: "Import '{name}' is shadowed by local declaration",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Rename the local declaration or use an import alias",
    explanation:
        "An import is shadowed by a local declaration with the same name. " +
        "This makes the import inaccessible and is likely a mistake.",
    example: {
        bad: 'import { foo } from "./utils"\nlet foo = 1',
        good: 'import { foo as utilsFoo } from "./utils"\nlet foo = 1',
        description: "Used import alias to avoid shadowing",
    },
    relatedCodes: ["VF5002"],
};

export const VF5004: DiagnosticDefinition = {
    code: "VF5004",
    title: "SelfImport",
    messageTemplate: "Module cannot import itself: '{path}'",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Remove the self-import or fix the import path",
    explanation:
        "A module is importing itself, either directly or via a path that resolves to the same file. " +
        "Self-imports serve no useful purpose and typically indicate a mistake in the import path.",
    example: {
        bad: '// utils.vf\nimport { helper } from "./utils"',
        good: "// utils.vf\n// No self-import needed - just use helper directly",
        description: "Removed the unnecessary self-import",
    },
    relatedCodes: ["VF5000", "VF5900"],
};

export const VF5005: DiagnosticDefinition = {
    code: "VF5005",
    title: "EntryPointNotFound",
    messageTemplate: "Entry point not found: '{path}'",
    severity: "error",
    phase: "modules",
    category: "import",
    hintTemplate: "Tried: {triedPaths}",
    explanation:
        "The specified entry point file could not be found. " +
        "This error occurs when starting compilation and the main file doesn't exist. " +
        "Check that the path is correct and the file exists.",
    example: {
        bad: "vibefun compile src/mian.vf",
        good: "vibefun compile src/main.vf",
        description: 'Fixed typo in entry point path: "mian.vf" → "main.vf"',
    },
    relatedCodes: ["VF5000"],
};

// =============================================================================
// VF5100-VF5199: Export Validation Errors
// =============================================================================

export const VF5100: DiagnosticDefinition = {
    code: "VF5100",
    title: "DuplicateExport",
    messageTemplate: "'{name}' is already exported",
    severity: "error",
    phase: "modules",
    category: "export",
    hintTemplate: "Remove the duplicate export declaration",
    explanation: "The same name is exported multiple times from this module. " + "Each exported name must be unique.",
    example: {
        bad: "export let foo = 1\nexport let foo = 2",
        good: "export let foo = 1\nexport let bar = 2",
        description: "Renamed duplicate export to have unique names",
    },
    relatedCodes: ["VF5101", "VF5102"],
};

export const VF5101: DiagnosticDefinition = {
    code: "VF5101",
    title: "ReexportConflict",
    messageTemplate: "Re-export '{name}' conflicts with existing export",
    severity: "error",
    phase: "modules",
    category: "export",
    hintTemplate: "Use an alias for the re-export or remove the conflicting export",
    explanation:
        "A re-export statement introduces a name that conflicts with an existing export. " +
        "This can happen when re-exporting from multiple modules or combining local exports with re-exports.",
    example: {
        bad: 'export { foo } from "./a"\nexport { foo } from "./b"',
        good: 'export { foo } from "./a"\nexport { foo as fooB } from "./b"',
        description: "Used alias for conflicting re-export",
    },
    relatedCodes: ["VF5100"],
};

// Note: VF5102 (DuplicateDeclaration) is defined in typechecker.ts as it's
// thrown from environment.ts during type checking. It could be moved here
// if the error is better categorized as a module system error.

// =============================================================================
// VF5900-VF5999: Module Warnings
// =============================================================================

export const VF5900: DiagnosticDefinition = {
    code: "VF5900",
    title: "CircularDependency",
    messageTemplate: "Circular dependency detected: {cycle}",
    severity: "warning",
    phase: "modules",
    category: "dependency",
    hintTemplate: "Consider restructuring modules to break the cycle",
    explanation:
        "A circular dependency was detected between modules. While this may work at runtime, " +
        "circular dependencies can lead to subtle bugs and make code harder to understand and maintain. " +
        "Consider extracting shared code into a separate module.",
    example: {
        bad: '// a.vf\nimport { b } from "./b"\n// b.vf\nimport { a } from "./a"',
        good: "// shared.vf\nexport let shared = ...\n// a.vf and b.vf import from shared",
        description: "Extract shared code to break the circular dependency",
    },
    relatedCodes: ["VF5000"],
};

export const VF5901: DiagnosticDefinition = {
    code: "VF5901",
    title: "CaseSensitivityMismatch",
    messageTemplate: "Module path '{actual}' has different casing than on disk: '{expected}'",
    severity: "warning",
    phase: "modules",
    category: "import",
    hintTemplate: "Use the exact casing as the file on disk",
    explanation:
        "The module path casing doesn't match the actual file name on disk. " +
        "While this may work on case-insensitive file systems (like macOS and Windows), " +
        "it will fail on case-sensitive systems (like Linux).",
    example: {
        bad: 'import { foo } from "./Utils"  // file is utils.vf',
        good: 'import { foo } from "./utils"',
        description: "Fixed casing to match actual file name",
    },
    relatedCodes: ["VF5000"],
};

// =============================================================================
// Registration
// =============================================================================

const modulesCodes: readonly DiagnosticDefinition[] = [
    // Import resolution
    VF5000,
    VF5001,
    VF5002,
    VF5003,
    VF5004,
    VF5005,
    // Export validation
    VF5100,
    VF5101,
    // Warnings
    VF5900,
    VF5901,
];

/**
 * Register all module system diagnostic codes with the global registry.
 */
export function registerModulesCodes(): void {
    registry.registerAll(modulesCodes);
}
