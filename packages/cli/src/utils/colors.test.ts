import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createColors, shouldUseColor } from "./colors.js";

describe("shouldUseColor", () => {
    const originalEnv = { ...process.env };
    const originalIsTTY = process.stdout.isTTY;

    beforeEach(() => {
        // Clear relevant env vars
        delete process.env["NO_COLOR"];
        delete process.env["FORCE_COLOR"];
        delete process.env["CI"];
    });

    afterEach(() => {
        // Restore environment
        process.env = { ...originalEnv };
        Object.defineProperty(process.stdout, "isTTY", {
            value: originalIsTTY,
            writable: true,
        });
    });

    describe("CLI flags", () => {
        it("should return false when --no-color is set", () => {
            expect(shouldUseColor({ noColor: true })).toBe(false);
        });

        it("should return true when --color is set", () => {
            expect(shouldUseColor({ color: true })).toBe(true);
        });

        it("should prefer --no-color over --color", () => {
            expect(shouldUseColor({ color: true, noColor: true })).toBe(false);
        });
    });

    describe("environment variables", () => {
        it("should return false when NO_COLOR is set", () => {
            process.env["NO_COLOR"] = "1";
            expect(shouldUseColor()).toBe(false);
        });

        it("should return false when NO_COLOR is empty string", () => {
            process.env["NO_COLOR"] = "";
            expect(shouldUseColor()).toBe(false);
        });

        it("should return true when FORCE_COLOR is set", () => {
            process.env["FORCE_COLOR"] = "1";
            expect(shouldUseColor()).toBe(true);
        });

        it("should prefer NO_COLOR over FORCE_COLOR", () => {
            process.env["NO_COLOR"] = "1";
            process.env["FORCE_COLOR"] = "1";
            expect(shouldUseColor()).toBe(false);
        });

        it("should return false when CI is set", () => {
            process.env["CI"] = "true";
            Object.defineProperty(process.stdout, "isTTY", {
                value: true,
                writable: true,
            });
            expect(shouldUseColor()).toBe(false);
        });
    });

    describe("TTY detection", () => {
        it("should return true when stdout is a TTY", () => {
            Object.defineProperty(process.stdout, "isTTY", {
                value: true,
                writable: true,
            });
            expect(shouldUseColor()).toBe(true);
        });

        it("should return false when stdout is not a TTY", () => {
            Object.defineProperty(process.stdout, "isTTY", {
                value: false,
                writable: true,
            });
            expect(shouldUseColor()).toBe(false);
        });

        it("should return false when isTTY is undefined", () => {
            Object.defineProperty(process.stdout, "isTTY", {
                value: undefined,
                writable: true,
            });
            expect(shouldUseColor()).toBe(false);
        });
    });

    describe("priority", () => {
        it("should prefer CLI flags over env vars", () => {
            process.env["NO_COLOR"] = "1";
            expect(shouldUseColor({ color: true })).toBe(true);
        });

        it("should prefer env vars over TTY detection", () => {
            Object.defineProperty(process.stdout, "isTTY", {
                value: true,
                writable: true,
            });
            process.env["NO_COLOR"] = "1";
            expect(shouldUseColor()).toBe(false);
        });
    });
});

describe("createColors", () => {
    describe("when colors enabled", () => {
        it("should return functions that add ANSI codes", () => {
            const colors = createColors(true);

            expect(colors.red("error")).toContain("\x1b[31m");
            expect(colors.red("error")).toContain("error");
            expect(colors.red("error")).toContain("\x1b[0m");
        });

        it("should wrap text with correct color codes", () => {
            const colors = createColors(true);

            expect(colors.yellow("warning")).toContain("\x1b[33m");
            expect(colors.cyan("info")).toContain("\x1b[36m");
            expect(colors.dim("faded")).toContain("\x1b[2m");
            expect(colors.bold("strong")).toContain("\x1b[1m");
        });
    });

    describe("when colors disabled", () => {
        it("should return identity functions", () => {
            const colors = createColors(false);

            expect(colors.red("error")).toBe("error");
            expect(colors.yellow("warning")).toBe("warning");
            expect(colors.cyan("info")).toBe("info");
            expect(colors.dim("faded")).toBe("faded");
            expect(colors.bold("strong")).toBe("strong");
        });

        it("should not include any ANSI codes", () => {
            const colors = createColors(false);

            expect(colors.red("test")).not.toContain("\x1b");
            expect(colors.bold("test")).not.toContain("\x1b");
        });
    });
});
