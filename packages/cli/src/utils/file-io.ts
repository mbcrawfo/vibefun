/**
 * File I/O utilities for the vibefun CLI
 *
 * Provides safe file reading and writing with:
 * - UTF-8 BOM stripping
 * - Line ending normalization
 * - Atomic writes (temp file + rename)
 */

import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * UTF-8 Byte Order Mark
 */
const UTF8_BOM = "\uFEFF";

/**
 * Strip UTF-8 BOM from content if present
 */
export function stripBom(content: string): string {
    if (content.startsWith(UTF8_BOM)) {
        return content.slice(1);
    }
    return content;
}

/**
 * Normalize line endings to LF (\n)
 *
 * Handles:
 * - CRLF (Windows) -> LF
 * - CR (old Mac) -> LF
 */
export function normalizeLineEndings(content: string): string {
    // Replace CRLF first, then standalone CR
    return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Result of reading a source file
 */
export interface ReadResult {
    /** File content (BOM stripped, line endings normalized) */
    readonly content: string;
    /** Whether a BOM was stripped */
    readonly hadBom: boolean;
}

/**
 * Read a source file with BOM stripping and line ending normalization
 *
 * @throws Error with code 'ENOENT' if file doesn't exist
 * @throws Error with code 'EACCES' if permission denied
 */
export function readSourceFile(path: string): ReadResult {
    const raw = readFileSync(path, "utf-8");
    const hadBom = raw.startsWith(UTF8_BOM);
    const stripped = hadBom ? raw.slice(1) : raw;
    const content = normalizeLineEndings(stripped);

    return { content, hadBom };
}

/**
 * Write a file atomically
 *
 * Writes to a temporary file first, then renames to the target path.
 * This ensures the target file is never in a partial state.
 *
 * @param path - Target file path
 * @param content - Content to write
 * @throws Error if directory creation fails or write fails
 */
export function writeAtomic(path: string, content: string): void {
    const dir = dirname(path);

    // Create parent directories if needed
    mkdirSync(dir, { recursive: true });

    // Generate temp file path in same directory (for atomic rename)
    const tempName = `.vibefun-${randomBytes(8).toString("hex")}.tmp`;
    const tempPath = join(dir, tempName);

    try {
        // Write to temp file
        writeFileSync(tempPath, content, "utf-8");

        // Atomic rename (with fallback for Windows)
        try {
            renameSync(tempPath, path);
        } catch (renameError) {
            // On Windows, renameSync can fail with EEXIST or EPERM when destination exists.
            // Windows-specific fallback, cannot test on macOS/Linux CI
            /* v8 ignore next 6 */
            if (isNodeError(renameError) && (renameError.code === "EEXIST" || renameError.code === "EPERM")) {
                unlinkSync(path);
                renameSync(tempPath, path);
            } else {
                throw renameError;
            }
        }
    } catch (error) {
        // Clean up temp file if it exists
        try {
            unlinkSync(tempPath);
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}

/**
 * Check if an error is a Node.js filesystem error
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
}
