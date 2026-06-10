/**
 * Spec validation: Section 10 — JavaScript Interop.
 *
 * Covers external declarations, unsafe blocks, type safety at the FFI
 * boundary.
 */

import { describe, it } from "vitest";

import { expectCompileError, expectCompiles, expectRunOutput, expectRuntimeError, withOutput } from "./helpers.js";

describe("10-javascript-interop", () => {
    describe("external declarations", () => {
        it("external function declaration", () => {
            expectCompiles(`external console_log: (String) -> Unit = "console.log";`);
        });

        it("external with module import", () => {
            expectRunOutput(
                withOutput(
                    `external basename: (String) -> String = "basename" from "node:path";
let result = unsafe { basename("/tmp/file.txt") };`,
                    `result`,
                ),
                "file.txt",
            );
        });

        it("external block syntax", () => {
            expectCompiles(
                `external {
  log: (String) -> Unit = "console.log";
  warn: (String) -> Unit = "console.warn";
};`,
            );
        });

        it("generic external declaration", () => {
            expectCompiles(`external json_stringify: <T>(T) -> String = "JSON.stringify";`);
        });

        it("exported external declaration", () => {
            expectCompiles(`export external console_log: (String) -> Unit = "console.log";`);
        });
    });

    describe("multi-argument externals (auto-currying)", () => {
        // Per external-declarations.md:296-305, `(A, B) -> R` and
        // `A -> B -> R` are the SAME type (auto-currying). Multi-param
        // function types failed to typecheck with VF4021 before
        // [BUG: VF-FC-0009] was fixed; these pin the repaired behaviour.
        it("multi-arg external typechecks and runs with full application", () => {
            expectRunOutput(
                withOutput(
                    `external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let r = unsafe { add2(3, 4) };`,
                    `String.fromInt(r)`,
                ),
                "7",
            );
        });

        it("multi-arg external supports partial application", () => {
            expectRunOutput(
                withOutput(
                    `external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let add3 = unsafe { add2(3) };
let r = add3(4);`,
                    `String.fromInt(r)`,
                ),
                "7",
            );
        });

        it("3-arg external runs with full application", () => {
            expectRunOutput(
                withOutput(
                    `external sum3: (Int, Int, Int) -> Int = "((a, b, c) => a + b + c)";
let r = unsafe { sum3(1, 2, 3) };`,
                    `String.fromInt(r)`,
                ),
                "6",
            );
        });

        it("explicitly curried external type takes single-arg JS calls", () => {
            expectRunOutput(
                withOutput(
                    `external mk: (Int) -> (Int) -> Int = "((a) => (b) => a + b)";
let r = unsafe { mk(3)(4) };`,
                    `String.fromInt(r)`,
                ),
                "7",
            );
        });

        it("multi-param function-type annotation on a let compiles and runs", () => {
            expectRunOutput(
                withOutput(
                    `let add: (Int, Int) -> Int = (a, b) => a + b;
let r = add(3, 4);`,
                    `String.fromInt(r)`,
                ),
                "7",
            );
        });
    });

    describe("unsafe blocks", () => {
        it("unsafe block required for external calls", () => {
            expectRunOutput(
                `external console_log: (String) -> Unit = "console.log";
let _ = unsafe { console_log("hello") };`,
                "hello",
            );
        });

        it("unsafe block as expression returns value", () => {
            expectRunOutput(
                withOutput(
                    `external math_floor: (Float) -> Int = "Math.floor";
let result = unsafe { math_floor(3.7) };`,
                    `String.fromInt(result)`,
                ),
                "3",
            );
        });

        it("calling external without unsafe is error", () => {
            expectCompileError(
                `external console_log: (String) -> Unit = "console.log";
let _ = console_log("hello");`,
                "VF4805",
            );
        });

        it("nested unsafe blocks allowed", () => {
            expectRunOutput(
                withOutput(
                    `external math_abs: (Int) -> Int = "Math.abs";
let result = unsafe {
  let inner = unsafe { math_abs(-5) };
  inner;
};`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("try-catch in unsafe block", () => {
            expectRunOutput(
                withOutput(
                    `external json_parse: (String) -> Int = "JSON.parse";
let result = unsafe {
  try {
    json_parse("not json");
  } catch (e) {
    0;
  }
};`,
                    `String.fromInt(result)`,
                ),
                "0",
            );
        });
    });

    describe("type safety", () => {
        it("external declaration type checked at use site", () => {
            expectCompileError(
                `external parseInt: (String) -> Int = "parseInt";
let result = unsafe { parseInt(42) };`,
            );
        });

        it("external function used in pipe", () => {
            expectRunOutput(
                withOutput(
                    `external math_abs: (Int) -> Int = "Math.abs";
let result = unsafe { -5 |> math_abs };`,
                    `String.fromInt(result)`,
                ),
                "5",
            );
        });

        it("wrap external in safe function", () => {
            expectRunOutput(
                withOutput(
                    `external math_sqrt: (Float) -> Float = "Math.sqrt";
let safeSqrt = (x: Float) => unsafe { math_sqrt(x) };
let result = safeSqrt(9.0);`,
                    `String.fromFloat(result)`,
                ),
                "3",
            );
        });
    });

    describe("external overloading", () => {
        // F-03: the parser + typechecker accept multiple external declarations
        // that share a name and JS name but differ in arity (the "store
        // multiple overloads" capability). Arity-based call-site *resolution*
        // is a separate, unimplemented feature (VF4804) and is broken
        // end-to-end — a call collapses to the last declaration and fails
        // arity unification. See [BUG: VF-FC-0008].
        it("accepts same-name externals that differ only in arity", () => {
            expectCompiles(
                `external fetch: (String) -> Int = "fetch";
external fetch: (String, Int) -> Int = "fetch";`,
            );
        });

        // F-04: only externals can be overloaded — a second pure `let` with the
        // same name *shadows* the first (last binding wins) rather than forming
        // an arity-dispatched overload. Spec
        // external-declarations.md:237-243, :262-279.
        it("pure functions shadow rather than overload", () => {
            expectRunOutput(
                withOutput(
                    `let f = (x: Int) => "first";
let f = (x: Int) => "second";`,
                    `f(0)`,
                ),
                "second",
            );
        });

        // F-05/F-06/F-07 — overload *validation* (VF4801 inconsistent JS name,
        // VF4802 inconsistent `from`, VF4803 mixed function/non-function
        // shapes; external-declarations.md:237-260) is emitted by
        // buildEnvironment and covered at U-layer in
        // packages/core/src/typechecker/environment.test.ts, but it is DEAD in
        // the full compile pipeline: the desugarer rewrites `ExternalDecl` ->
        // `CoreExternalDecl`, a kind buildEnvironment's overload grouping never
        // matches, so none of VF4801/4802/4803 fire end-to-end. V-layer tests
        // are deferred until the validator runs post-desugaring. Once fixed, add:
        //   expectCompileError('external f: (Int)->Int = "a"; external f: (Int,Int)->Int = "b";', "VF4801");
        //   expectCompileError('external f: (Int)->Int = "x" from "a"; external f: (Int,Int)->Int = "x" from "b";', "VF4802");
        //   expectCompileError('external f: (Int)->Int = "x"; external f: Int = "x";', "VF4803");
        // Tracked in .claude/FAST_CHECK_BUG_BACKLOG.md [BUG: VF-FC-0008].
    });

    describe("opaque types", () => {
        // F-18: Json round-trips through the FFI boundary (JSON.parse ->
        // opaque Json -> JSON.stringify).
        it("Json round-trips through the FFI boundary", () => {
            expectRunOutput(
                withOutput(
                    `external js_parse: (String) -> Json = "JSON.parse";
external json_to_string: (Json) -> String = "JSON.stringify";
let j = unsafe { js_parse("{\\"x\\": 1}") };`,
                    `json_to_string(j)`,
                ),
                '{"x":1}',
            );
        });

        // F-19: JsObject behaves the same way as an opaque carrier.
        it("JsObject round-trips through the FFI boundary", () => {
            expectRunOutput(
                withOutput(
                    `external to_obj: (String) -> JsObject = "JSON.parse";
external from_obj: (JsObject) -> String = "JSON.stringify";
let o = unsafe { to_obj("{\\"a\\": 2}") };`,
                    `from_obj(o)`,
                ),
                '{"a":2}',
            );
        });

        // F-20: Promise<T> is accepted as an opaque type annotation. Awaiting
        // is a documented future feature (unsafe-blocks.md:97-103).
        it("Promise<T> is accepted as an opaque type", () => {
            expectCompiles(
                `external fetch_text: (String) -> Promise<String> = "fetch";
let p = unsafe { fetch_text("https://example.com") };`,
            );
        });

        // F-20 follow-up: with multi-argument externals fixed (VF-FC-0009),
        // Promise chaining via a `.then(p, f)` helper works end-to-end — the
        // microtask runs before node exits, so the output is observable.
        it("Promise<T> chains via a multi-argument .then external", () => {
            expectRunOutput(
                `external console_log: (String) -> Unit = "console.log";
external js_resolve: (String) -> Promise<String> = "((x) => Promise.resolve(x))";
external js_then: (Promise<String>, (String) -> Unit) -> Unit = "((p, f) => { p.then(f); })";
let _ = unsafe { js_then(js_resolve("chained"), (s) => unsafe { console_log(s) }) };`,
                "chained",
            );
        });

        // F-22: a value produced as Any can be passed to an external that
        // accepts Any — the documented usage (external-declarations.md:104-126).
        it("Any flows through Any-typed FFI channels", () => {
            expectRunOutput(
                withOutput(
                    `external to_any: (Int) -> Any = "((x) => x)";
external from_any: (Any) -> Int = "((x) => x)";
let a = unsafe { from_any(to_any(42)) };`,
                    `String.fromInt(a)`,
                ),
                "42",
            );
        });
        // F-22 (cont.): `Any` is opaque, NOT a top type. A value typed `Any`
        // only flows to/from externals declared with `Any`; using it at a
        // concrete type is a type error (VF4020). See
        // external-declarations.md:104-126.
        it("Any does not unify with a concrete type (opaque, not a top type)", () => {
            expectCompileError(
                `external to_any: (Int) -> Any = "((x) => x)";
let x = unsafe { to_any(42) };
let y = x + 1;`,
                "VF4020",
            );
        });
    });

    describe("try/catch error binding", () => {
        // F-21: the `catch (e)` binder is typed as the opaque `Json` type — the
        // compiler's representation for a caught, untyped JS value. The spec
        // leaves the binder type unspecified (its examples use untyped
        // `catch (error)`, e.g. unsafe-blocks.md:53-59), so `e` can be handed to
        // anything accepting Json...
        it("catch binder is usable as the opaque Json type", () => {
            expectRunOutput(
                withOutput(
                    `external json_str: (Json) -> String = "JSON.stringify";
external parse_int: (String) -> Int = "JSON.parse";
let r = unsafe {
  try { parse_int("not json"); "ok"; } catch (e) { json_str(e); }
};`,
                    `r`,
                ),
                "{}",
            );
        });

        // ...but cannot be used as an unrelated concrete type: e is rigidly
        // Json, not a fresh type variable, so `inc(e)` (inc expects Int) is a
        // type error rather than instantiating e to Int.
        it("catch binder does not unify with a concrete non-Json type", () => {
            expectCompileError(
                `external inc: (Int) -> Int = "((x) => x + 1)";
external parse_int: (String) -> Int = "JSON.parse";
let r = unsafe {
  try { parse_int("not json"); 0; } catch (e) { inc(e); }
};`,
                "VF4020",
            );
        });
    });

    describe("null handling", () => {
        // [BUG: VF-FC-0010] Spec type-safety.md:58-77 says a JS null/undefined
        // returned from an external typed `-> Option<T>` is marshalled to
        // `None` (a value to `Some`). No such conversion is emitted: the raw
        // `null` reaches the `match`, which exhausts at runtime. The
        // `--runtime-checks` modes the spec ties this to are also unimplemented
        // (the CLI rejects the flag). This pins the current (buggy) "Match
        // exhausted" runtime error; once null->None marshalling lands, flip to
        // expectRunOutput(..., "none"). Tracked in
        // .claude/FAST_CHECK_BUG_BACKLOG.md.
        it("[BUG: VF-FC-0010] null is not auto-marshalled to None at the FFI boundary", () => {
            expectRuntimeError(
                withOutput(
                    `external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";`,
                    `match js_maybe(false) { | Some(_) => "got" | None => "none" }`,
                ),
                "Match exhausted",
            );
        });
    });

    describe("external block syntax", () => {
        // F-31: items inside an external block must be separated by semicolons;
        // omitting one is VF2007. (Two *top-level* externals with a missing
        // separator instead report VF2107, the general declaration-separator
        // error — VF2007 is specific to the block-item separator.)
        it("missing semicolon between external block items is VF2007", () => {
            expectCompileError(
                `external {
  log: (String) -> Unit = "console.log"
  warn: (String) -> Unit = "console.warn"
};`,
                "VF2007",
            );
        });
    });
});
