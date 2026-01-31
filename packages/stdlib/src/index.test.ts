/**
 * Standard Library Tests
 *
 * Currently stdlib only exports VERSION, so tests are minimal.
 * Comprehensive tests will be added as stdlib functionality grows:
 * - List operations (map, filter, fold)
 * - Option/Result type utilities
 * - String and math utilities
 */
import { describe, expect, it } from "vitest";

import { VERSION } from "./index.js";

describe("stdlib", () => {
    describe("VERSION", () => {
        it("exports the current version", () => {
            expect(VERSION).toBe("0.1.0");
        });

        it("follows semver format", () => {
            expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });
});
