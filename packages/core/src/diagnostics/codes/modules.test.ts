/**
 * Tests for module system diagnostic codes (VF5xxx)
 */

import type { Location } from "../../types/ast.js";

import { beforeEach, describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostic.js";
import { createDiagnostic, throwDiagnostic } from "../factory.js";
import { initializeDiagnosticCodes } from "../index.js";
import { WarningCollector } from "../warning-collector.js";

// Helper to create a test location
function testLoc(line = 1, column = 1): Location {
    return { file: "test.vf", line, column, offset: 0 };
}

// Initialize diagnostic codes before tests
beforeEach(() => {
    initializeDiagnosticCodes();
});

describe("Module Import Resolution Errors (VF5000-VF5099)", () => {
    describe("VF5000: ModuleNotFound", () => {
        it("creates error with module path", () => {
            const diagnostic = createDiagnostic("VF5000", testLoc(), {
                path: "./missing-module",
            });

            expect(diagnostic).toBeInstanceOf(VibefunDiagnostic);
            expect(diagnostic.code).toBe("VF5000");
            expect(diagnostic.diagnosticMessage).toBe("Module './missing-module' not found");
            expect(diagnostic.severity).toBe("error");
        });

        it("throws with correct code", () => {
            expect(() => throwDiagnostic("VF5000", testLoc(), { path: "./nonexistent" })).toThrow(VibefunDiagnostic);
        });
    });

    describe("VF5001: ImportNotExported", () => {
        it("creates error with name and path", () => {
            const diagnostic = createDiagnostic("VF5001", testLoc(), {
                name: "helper",
                path: "./utils",
            });

            expect(diagnostic.code).toBe("VF5001");
            expect(diagnostic.diagnosticMessage).toBe("'helper' is not exported from module './utils'");
        });
    });

    describe("VF5002: DuplicateImport", () => {
        it("creates error with duplicate name", () => {
            const diagnostic = createDiagnostic("VF5002", testLoc(), {
                name: "foo",
            });

            expect(diagnostic.code).toBe("VF5002");
            expect(diagnostic.diagnosticMessage).toBe("'foo' is already imported");
        });
    });

    describe("VF5003: ImportShadowed", () => {
        it("creates error with shadowed name", () => {
            const diagnostic = createDiagnostic("VF5003", testLoc(), {
                name: "bar",
            });

            expect(diagnostic.code).toBe("VF5003");
            expect(diagnostic.diagnosticMessage).toBe("Import 'bar' is shadowed by local declaration");
        });
    });

    describe("VF5004: SelfImport", () => {
        it("creates error with module path", () => {
            const diagnostic = createDiagnostic("VF5004", testLoc(), {
                path: "./utils",
            });

            expect(diagnostic).toBeInstanceOf(VibefunDiagnostic);
            expect(diagnostic.code).toBe("VF5004");
            expect(diagnostic.diagnosticMessage).toBe("Module cannot import itself: './utils'");
            expect(diagnostic.severity).toBe("error");
        });

        it("throws with correct code", () => {
            expect(() => throwDiagnostic("VF5004", testLoc(), { path: "./self" })).toThrow(VibefunDiagnostic);

            try {
                throwDiagnostic("VF5004", testLoc(), { path: "./self" });
            } catch (e) {
                expect(e).toBeInstanceOf(VibefunDiagnostic);
                expect((e as VibefunDiagnostic).code).toBe("VF5004");
            }
        });

        it("includes hint in diagnostic", () => {
            const diagnostic = createDiagnostic("VF5004", testLoc(), {
                path: "./current-module",
            });

            expect(diagnostic.hint).toBe("Remove the self-import or fix the import path");
        });
    });

    describe("VF5005: EntryPointNotFound", () => {
        it("creates error with entry point path", () => {
            const diagnostic = createDiagnostic("VF5005", testLoc(), {
                path: "src/main.vf",
                triedPaths: "src/main.vf, src/main/index.vf",
            });

            expect(diagnostic).toBeInstanceOf(VibefunDiagnostic);
            expect(diagnostic.code).toBe("VF5005");
            expect(diagnostic.diagnosticMessage).toBe("Entry point not found: 'src/main.vf'");
            expect(diagnostic.severity).toBe("error");
        });

        it("throws with correct code", () => {
            expect(() =>
                throwDiagnostic("VF5005", testLoc(), {
                    path: "src/mian.vf",
                    triedPaths: "src/mian.vf, src/mian/index.vf",
                }),
            ).toThrow(VibefunDiagnostic);
        });

        it("includes hint with tried paths", () => {
            const diagnostic = createDiagnostic("VF5005", testLoc(), {
                path: "src/main.vf",
                triedPaths: "src/main.vf, src/main/index.vf",
            });

            expect(diagnostic.hint).toBe("Tried: src/main.vf, src/main/index.vf");
        });
    });
});

describe("Module Export Validation Errors (VF5100-VF5199)", () => {
    describe("VF5100: DuplicateExport", () => {
        it("creates error with export name", () => {
            const diagnostic = createDiagnostic("VF5100", testLoc(), {
                name: "helper",
            });

            expect(diagnostic.code).toBe("VF5100");
            expect(diagnostic.diagnosticMessage).toBe("'helper' is already exported");
        });
    });

    describe("VF5101: ReexportConflict", () => {
        it("creates error with conflicting name", () => {
            const diagnostic = createDiagnostic("VF5101", testLoc(), {
                name: "map",
            });

            expect(diagnostic.code).toBe("VF5101");
            expect(diagnostic.diagnosticMessage).toBe("Re-export 'map' conflicts with existing export");
        });
    });
});

describe("Module Warnings (VF5900-VF5999)", () => {
    describe("VF5900: CircularDependency", () => {
        it("creates warning with cycle path", () => {
            const warning = createDiagnostic("VF5900", testLoc(), {
                cycle: "a.vf \u2192 b.vf \u2192 a.vf",
            });

            expect(warning).toBeInstanceOf(VibefunDiagnostic);
            expect(warning.code).toBe("VF5900");
            expect(warning.diagnosticMessage).toBe("Circular dependency detected: a.vf \u2192 b.vf \u2192 a.vf");
            expect(warning.severity).toBe("warning");
        });

        it("can be added to WarningCollector", () => {
            const collector = new WarningCollector();
            const warning = createDiagnostic("VF5900", testLoc(), {
                cycle: "a.vf \u2192 b.vf \u2192 c.vf \u2192 a.vf",
            });

            collector.add(warning);

            const warnings = collector.getWarnings();
            expect(warnings).toHaveLength(1);
            expect(warnings[0]!.code).toBe("VF5900");
        });

        it("includes hint in warning", () => {
            const warning = createDiagnostic("VF5900", testLoc(), {
                cycle: "a.vf \u2192 b.vf \u2192 a.vf",
            });

            expect(warning.hint).toBe("Consider restructuring modules to break the cycle");
        });
    });

    describe("VF5901: CaseSensitivityMismatch", () => {
        it("creates warning with actual and expected paths", () => {
            const warning = createDiagnostic("VF5901", testLoc(), {
                actual: "./Utils",
                expected: "./utils",
            });

            expect(warning).toBeInstanceOf(VibefunDiagnostic);
            expect(warning.code).toBe("VF5901");
            expect(warning.diagnosticMessage).toBe(
                "Module path './Utils' has different casing than on disk: './utils'",
            );
            expect(warning.severity).toBe("warning");
        });

        it("can be added to WarningCollector", () => {
            const collector = new WarningCollector();
            const warning = createDiagnostic("VF5901", testLoc(), {
                actual: "./MyModule",
                expected: "./mymodule",
            });

            collector.add(warning);

            const warnings = collector.getWarnings();
            expect(warnings).toHaveLength(1);
            expect(warnings[0]!.code).toBe("VF5901");
        });

        it("includes hint in warning", () => {
            const warning = createDiagnostic("VF5901", testLoc(), {
                actual: "./Utils",
                expected: "./utils",
            });

            expect(warning.hint).toBe("Use the exact casing as the file on disk");
        });
    });
});

describe("Module diagnostic code registration", () => {
    it("all module codes are registered", () => {
        const codes = [
            "VF5000",
            "VF5001",
            "VF5002",
            "VF5003",
            "VF5004",
            "VF5005",
            "VF5100",
            "VF5101",
            "VF5900",
            "VF5901",
        ];

        for (const code of codes) {
            expect(() => createDiagnostic(code, testLoc())).not.toThrow(`Unknown diagnostic code: ${code}`);
        }
    });
});
