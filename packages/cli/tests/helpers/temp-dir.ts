/**
 * Temporary directory management for tests
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Manages a temporary directory for test outputs */
export class TempDir {
    private path: string | null = null;

    /** Create and return the temp directory path */
    setup(): string {
        this.path = join(tmpdir(), `vibefun-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(this.path, { recursive: true });
        return this.path;
    }

    /** Clean up the temp directory */
    cleanup(): void {
        if (this.path) {
            rmSync(this.path, { recursive: true, force: true });
            this.path = null;
        }
    }

    /** Get the temp directory path (throws if not set up) */
    getPath(): string {
        if (!this.path) {
            throw new Error("TempDir not set up - call setup() first");
        }
        return this.path;
    }

    /** Join paths relative to the temp directory */
    join(...paths: string[]): string {
        return join(this.getPath(), ...paths);
    }

    /** Write a file to the temp directory */
    writeFile(relativePath: string, content: string): void {
        writeFileSync(this.join(relativePath), content, "utf-8");
    }

    /** Read a file from the temp directory */
    readFile(relativePath: string): string {
        return readFileSync(this.join(relativePath), "utf-8");
    }

    /** Check if a file exists in the temp directory */
    exists(relativePath: string): boolean {
        return existsSync(this.join(relativePath));
    }
}
