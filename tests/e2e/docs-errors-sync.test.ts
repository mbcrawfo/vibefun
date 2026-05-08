/**
 * F-20: docs/errors/ stays in sync with the diagnostic registry.
 *
 * Runs `pnpm docs:errors` against the live working tree and asserts that
 * `git status --porcelain -- docs/errors/` is empty afterwards. This is
 * stricter than the existing `pnpm docs:errors:check` CI step in one
 * specific way: it catches *untracked* files the generator might emit
 * (e.g. a freshly-added phase doc) that a plain content-diff wouldn't
 * notice. A regression in the generator that produces a previously
 * undocumented phase file would slip past `--check` because that script
 * only verifies the in-memory output matches existing files; it doesn't
 * scan for newcomers.
 *
 * Teardown restores `docs/errors/` to its pre-run state regardless of
 * whether the assertion passed or failed:
 *   - `git checkout -- docs/errors/` rolls back content modifications
 *     to tracked files
 *   - `git clean -fd -- docs/errors/` deletes any untracked files or
 *     directories the generator emitted
 *
 * Without both halves of teardown a CI failure (or a developer running
 * the test on a dirty checkout) would leave the working tree mutated.
 */

import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

import { REPO_ROOT } from "./helpers.js";

interface ProcessOutcome {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
}

function run(cmd: string, args: readonly string[], cwd: string = REPO_ROOT): ProcessOutcome {
    const result = spawnSync(cmd, [...args], {
        cwd,
        encoding: "utf-8",
        env: { ...process.env, NO_COLOR: "1" },
    });
    if (result.error !== undefined) {
        throw new Error(`Infrastructure error: ${cmd} ${args.join(" ")} → ${result.error.message}`);
    }
    if (result.status === null) {
        throw new Error(`Infrastructure error: ${cmd} ${args.join(" ")} did not exit cleanly`);
    }
    return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.status,
    };
}

function gitStatusDocsErrors(): string {
    const result = run("git", ["status", "--porcelain", "--", "docs/errors/"]);
    if (result.exitCode !== 0) {
        throw new Error(`git status failed: ${result.stderr}`);
    }
    return result.stdout;
}

function restoreDocsErrors(): void {
    // Roll back content modifications to tracked files…
    const checkout = run("git", ["checkout", "--", "docs/errors/"]);
    if (checkout.exitCode !== 0) {
        throw new Error(
            `git checkout -- docs/errors/ failed (exit ${checkout.exitCode}): ${checkout.stderr || checkout.stdout}`,
        );
    }
    // …and remove anything the generator emitted that wasn't tracked.
    const clean = run("git", ["clean", "-fd", "--", "docs/errors/"]);
    if (clean.exitCode !== 0) {
        throw new Error(
            `git clean -fd -- docs/errors/ failed (exit ${clean.exitCode}): ${clean.stderr || clean.stdout}`,
        );
    }
}

describe("docs/errors/ sync (F-20)", () => {
    // Tracks whether docs/errors/ was clean when the test started. The
    // teardown is destructive (`git checkout` + `git clean`), so we must
    // only run it when we know the dirty state was caused by the test
    // itself — running it on a working tree that was already dirty would
    // wipe a developer's unrelated local edits.
    let docsErrorsWasCleanAtStart = false;

    afterEach(() => {
        if (docsErrorsWasCleanAtStart) {
            restoreDocsErrors();
        }
        docsErrorsWasCleanAtStart = false;
    });

    it("pnpm docs:errors leaves the working tree clean under docs/errors/", () => {
        // Snapshot the pre-run state so we can give a useful failure
        // message if docs/errors/ was already dirty for an unrelated
        // reason — that would mask the regression we care about. Only
        // arm the teardown once we know we started clean.
        const before = gitStatusDocsErrors();
        docsErrorsWasCleanAtStart = before === "";
        expect(
            before,
            `docs/errors/ was already dirty before regenerating; ` +
                `restore it (git checkout -- docs/errors/ && git clean -fd -- docs/errors/) ` +
                `before re-running this test:\n${before}`,
        ).toBe("");

        const generation = run("pnpm", ["docs:errors"]);
        expect(generation.exitCode, `pnpm docs:errors failed:\n${generation.stderr}`).toBe(0);

        const after = gitStatusDocsErrors();
        expect(
            after,
            `pnpm docs:errors mutated the working tree — the generated ` +
                `documentation is out of sync with the diagnostic registry. ` +
                `Run 'pnpm docs:errors' locally and commit the result:\n${after}`,
        ).toBe("");
    });
});
