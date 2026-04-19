/**
 * End-to-end tests for user-defined type declarations through the CLI.
 *
 * Verifies that variant constructors, type aliases, and generic record
 * types survive the full compile+run pipeline including stdlib resolution
 * for `String.fromInt` / `String.fromBool`.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e user-defined types", () => {
    it("matches against a user-declared nullary variant", () => {
        const source = withOutput(
            `
            type Color = Red | Green | Blue;
            let c = Green;
            let name = match c {
                | Red => "red"
                | Green => "green"
                | Blue => "blue"
            };
            `,
            `name`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("green");
    });

    it("treats a type alias transparently as its aliased type", () => {
        const source = withOutput(
            `
            type UserId = Int;
            let id: UserId = 42;
            let doubled = id * 2;
            `,
            `String.fromInt(doubled)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("84");
    });

    it("expands a generic record alias on field access", () => {
        const source = withOutput(
            `
            type Box<T> = { value: T };
            let b: Box<Int> = { value: 7 };
            `,
            `String.fromInt(b.value)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("7");
    });

    it("rejects an unguardedly recursive type alias at compile time", () => {
        const source = `type Bad = Bad;`;
        const result = runSource(source);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain("VF4027");
    });
});
