/**
 * Test fixture utilities
 */

import { join, resolve } from "node:path";

/** Path to test fixtures directory */
export const FIXTURES_PATH = resolve(__dirname, "../fixtures");

/**
 * Get path to a test fixture file
 */
export function fixture(name: string): string {
    return join(FIXTURES_PATH, name);
}

/** Standard fixture names for documentation */
export const FIXTURES = {
    simple: "simple.vf",
    empty: "empty.vf",
    commentsOnly: "comments-only.vf",
    parseError: "parse-error.vf",
    typeError: "type-error.vf",
    multiError: "multi-error.vf",
    unicode: "unicode.vf",
    withBom: "with-bom.vf",
    pathWithSpaces: "path with spaces/test.vf",
} as const;
