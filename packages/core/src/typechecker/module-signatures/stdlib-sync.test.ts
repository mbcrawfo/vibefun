/**
 * Cross-boundary sync test: @vibefun/std runtime ↔ signature registry.
 *
 * The runtime (packages/stdlib/src) and the signature registry
 * (packages/core/src/typechecker/module-signatures/stdlib) are two
 * hand-maintained descriptions of the same contract. This test asserts
 * that the set of exported names agrees across both sides, catching the
 * biggest drift category (added / removed / renamed functions).
 *
 * Not covered (fundamentally hard through erased, curried JS):
 *  - Arity drift (`fn(a)(b)` vs. `a -> b -> c -> d`).
 *  - Parameter-order drift (data-first vs. data-last).
 *  - Type-shape drift (`Int` vs. `Float` parameters).
 * Those remain guarded by positive-path integration tests in the
 * spec-validation suite.
 */

import * as std from "@vibefun/std";
import { describe, expect, it } from "vitest";

import { getStdlibModuleNames, getStdlibModuleSignature, getStdlibRootSignature } from "./index.js";

const MODULE_NAMES = ["String", "List", "Option", "Result", "Int", "Float", "Math"] as const;
const VARIANT_CTORS = ["Cons", "Nil", "Some", "None", "Ok", "Err"] as const;

// Top-level exports of @vibefun/std that are intentionally outside the
// typechecker's module system. Each one must be justified — the
// "no unexplained runtime exports" assertion below fails if a new
// top-level export lands without either a registry entry or a
// deliberate addition here.
const RUNTIME_ONLY: ReadonlySet<string> = new Set([
    // Package version string; not language-visible.
    "VERSION",
    // Compiler-reserved aggregate used by the desugarer for synthesized
    // references like `__std__.List.concat`. The registry's root
    // signature (getStdlibRootSignature) is the typechecker view; the
    // shape is asserted separately below.
    "__std__",
]);

const stdRecord = std as unknown as Record<string, unknown>;

describe("stdlib sync", () => {
    describe("module set", () => {
        it("registry exposes exactly the expected modules", () => {
            expect(getStdlibModuleNames().sort()).toEqual([...MODULE_NAMES].sort());
        });

        it("every registered module exists at runtime as a namespace object", () => {
            for (const name of MODULE_NAMES) {
                const runtime = stdRecord[name];
                expect(runtime, `@vibefun/std.${name} should be exported`).toBeDefined();
                expect(typeof runtime, `@vibefun/std.${name} should be a namespace object`).toBe("object");
            }
        });
    });

    describe("per-module key equality", () => {
        for (const name of MODULE_NAMES) {
            it(`${name}: runtime keys match registry signature keys`, () => {
                const runtime = stdRecord[name] as Record<string, unknown>;
                const signature = getStdlibModuleSignature(name);
                expect(signature, `registry must have signature for ${name}`).not.toBeNull();
                if (signature === null || signature.type !== "Module") return;

                const runtimeKeys = Object.keys(runtime).sort();
                const registryKeys = [...signature.exports.keys()].sort();
                expect(runtimeKeys).toEqual(registryKeys);
            });
        }
    });

    describe("variant constructors", () => {
        // Variant constructors are bound ambiently via builtins.ts
        // (CoreVariant nodes emit `$tag` shapes directly). They are
        // NOT fields of getStdlibRootSignature(), so the asymmetry
        // below between the registry root (7 modules) and the runtime
        // __std__ aggregate (7 modules + 6 constructors) is by design.
        //
        // Nullary constructors (Nil, None) are exported as singleton
        // values matching the codegen for user-defined zero-arg variants
        // (`const Red = { $tag: "Red" };`). Constructors taking arguments
        // are exported as curried factory functions.
        const NULLARY_CTORS: ReadonlySet<string> = new Set(["Nil", "None"]);
        for (const ctor of VARIANT_CTORS) {
            it(`${ctor}: runtime export is the expected shape`, () => {
                const exported = stdRecord[ctor];
                expect(exported, `@vibefun/std.${ctor} should be exported`).toBeDefined();
                if (NULLARY_CTORS.has(ctor)) {
                    // Tighten the assertion so a function-like export
                    // accidentally carrying `$tag` doesn't pass.
                    expect(typeof exported).toBe("object");
                    expect(exported).not.toBeNull();
                    expect(exported).toMatchObject({ $tag: ctor });
                } else {
                    expect(typeof exported).toBe("function");
                }
            });
        }
    });

    describe("__std__ aggregate", () => {
        it("runtime __std__ aggregates every module plus every variant constructor", () => {
            const aggregate = stdRecord["__std__"] as Record<string, unknown>;
            expect(Object.keys(aggregate).sort()).toEqual([...MODULE_NAMES, ...VARIANT_CTORS].sort());
        });

        it("registry root exposes every stdlib module (modules only — variants ambient)", () => {
            const root = getStdlibRootSignature();
            expect(root.type).toBe("Module");
            if (root.type !== "Module") return;
            expect([...root.exports.keys()].sort()).toEqual([...MODULE_NAMES].sort());
        });
    });

    describe("no unexplained runtime exports", () => {
        it("every top-level export of @vibefun/std is a module, a variant, or in RUNTIME_ONLY", () => {
            const expected = new Set<string>([...MODULE_NAMES, ...VARIANT_CTORS, ...RUNTIME_ONLY]);
            const actual = new Set(Object.keys(stdRecord));
            const unexplained = [...actual].filter((k) => !expected.has(k));
            const missing = [...expected].filter((k) => !actual.has(k));
            expect(
                { unexplained, missing },
                "If this fails: either register the new export in module-signatures, or add it to RUNTIME_ONLY with a comment explaining why it's not language-visible.",
            ).toEqual({ unexplained: [], missing: [] });
        });
    });
});
