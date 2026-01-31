import { describe, expect, it } from "vitest";

import { formatBytes, formatDuration, Timer } from "./timer.js";

describe("Timer", () => {
    describe("basic timing", () => {
        it("should track a single phase", () => {
            const timer = new Timer();
            timer.start("parse");
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases).toHaveLength(1);
            expect(timings.phases[0]?.name).toBe("parse");
            expect(timings.phases[0]?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("should track multiple phases", () => {
            const timer = new Timer();

            timer.start("lex");
            timer.stop();
            timer.start("parse");
            timer.stop();
            timer.start("typecheck");
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases).toHaveLength(3);
            expect(timings.phases.map((p) => p.name)).toEqual(["lex", "parse", "typecheck"]);
        });

        it("should auto-stop previous phase when starting new one", () => {
            const timer = new Timer();

            timer.start("lex");
            timer.start("parse"); // Should auto-stop "lex"
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases).toHaveLength(2);
        });

        it("should calculate total time", () => {
            const timer = new Timer();

            timer.start("phase1");
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.totalMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("metadata", () => {
        it("should track phase metadata", () => {
            const timer = new Timer();

            timer.start("lex");
            timer.addMetadata("tokens", 42);
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases[0]?.metadata).toEqual({ tokens: 42 });
        });

        it("should track multiple metadata entries", () => {
            const timer = new Timer();

            timer.start("parse");
            timer.addMetadata("nodes", 100);
            timer.addMetadata("errors", 0);
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases[0]?.metadata).toEqual({ nodes: 100, errors: 0 });
        });

        it("should not include metadata if none was added", () => {
            const timer = new Timer();

            timer.start("simple");
            timer.stop();

            const timings = timer.getTimings();
            expect(timings.phases[0]?.metadata).toBeUndefined();
        });
    });

    describe("output bytes", () => {
        it("should track output bytes", () => {
            const timer = new Timer();
            timer.start("codegen");
            timer.stop();
            timer.setOutputBytes(1234);

            const timings = timer.getTimings();
            expect(timings.outputBytes).toBe(1234);
        });
    });

    describe("formatVerbose", () => {
        it("should format output for human reading", () => {
            const timer = new Timer();

            timer.start("lex");
            timer.addMetadata("tokens", 42);
            timer.stop();

            const output = timer.formatVerbose("test.vf");

            expect(output).toContain("Compiling test.vf");
            expect(output).toContain("lex:");
            expect(output).toContain("tokens: 42");
            expect(output).toContain("Total:");
        });

        it("should include output bytes when set", () => {
            const timer = new Timer();
            timer.start("codegen");
            timer.stop();
            timer.setOutputBytes(2048);

            const output = timer.formatVerbose("test.vf");
            expect(output).toContain("Output: 2.0KB");
        });
    });

    describe("toJSON", () => {
        it("should return JSON-serializable object", () => {
            const timer = new Timer();

            timer.start("parse");
            timer.addMetadata("nodes", 10);
            timer.stop();
            timer.setOutputBytes(500);

            const json = timer.toJSON();

            expect(json.totalMs).toBeGreaterThanOrEqual(0);
            expect(json.phases).toHaveLength(1);
            expect(json.phases[0]?.name).toBe("parse");
            expect(json.phases[0]?.metadata).toEqual({ nodes: 10 });
            expect(json.outputBytes).toBe(500);

            // Verify it's actually serializable
            expect(() => JSON.stringify(json)).not.toThrow();
        });
    });
});

describe("formatDuration", () => {
    it("should format microseconds", () => {
        expect(formatDuration(0.5)).toBe("500µs");
        expect(formatDuration(0.001)).toBe("1µs");
    });

    it("should format milliseconds", () => {
        expect(formatDuration(1)).toBe("1.0ms");
        expect(formatDuration(50.5)).toBe("50.5ms");
        expect(formatDuration(999.9)).toBe("999.9ms");
    });

    it("should format seconds", () => {
        expect(formatDuration(1000)).toBe("1.00s");
        expect(formatDuration(1500)).toBe("1.50s");
        expect(formatDuration(10000)).toBe("10.00s");
    });
});

describe("formatBytes", () => {
    it("should format bytes", () => {
        expect(formatBytes(0)).toBe("0B");
        expect(formatBytes(100)).toBe("100B");
        expect(formatBytes(1023)).toBe("1023B");
    });

    it("should format kilobytes", () => {
        expect(formatBytes(1024)).toBe("1.0KB");
        expect(formatBytes(2048)).toBe("2.0KB");
        expect(formatBytes(1536)).toBe("1.5KB");
    });

    it("should format megabytes", () => {
        expect(formatBytes(1024 * 1024)).toBe("1.00MB");
        expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.50MB");
    });
});
