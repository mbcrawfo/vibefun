# Section 10: JavaScript Interop - Failure Analysis

## Summary
- Total tests: 9
- Passing: 5
- Failing: 4
- Key issues: Most failures are due to stdlib `String` module not being available (test infrastructure dependency), plus one real missing feature (unsafe enforcement)

## Root Causes

### RC-1: Standard Library `String` Module Not Available
**Affected tests:** "unsafe block as expression returns value", "external function used in pipe", "wrap external in safe function"
**Description:** All three fail with `VF4100: Undefined variable 'String'` because they use `String.fromInt()` or `String.fromFloat()` (via the `withOutput` helper) to convert numeric results for output verification. The actual interop features work correctly -- verified in isolation by replacing the `String.fromInt` calls with simple string output. This is a section 11 stdlib dependency, not an interop bug.
**Evidence:** `VF4100: Undefined variable 'String'` error when compiling test code
**Estimated complexity:** Not applicable to section 10. Fix is in stdlib availability.

### RC-2: Missing Unsafe Enforcement for External Calls
**Affected tests:** "calling external without unsafe is error"
**Description:** The spec requires external functions to only be callable inside `unsafe` blocks, but the compiler allows them anywhere. The typechecker at `packages/core/src/typechecker/infer/infer-primitives.ts:259-263` treats `CoreUnsafe` as a transparent pass-through with no context tracking. No diagnostic code exists for this error (VF4800-VF4804 cover other FFI errors). The code `external console_log: (String) -> Unit = "console.log"; let _ = console_log("hello");` compiles and runs successfully when it should be rejected.
**Evidence:** Code with external calls outside unsafe blocks compiles and runs without error
**Estimated complexity:** Medium (50-200 lines). Needs: (1) new diagnostic code, (2) unsafe-context tracking in inference context, (3) check when resolving external-bound variables, (4) distinguishing external vs regular bindings in the environment.

## Dependencies
- RC-1 depends on stdlib/builtin resolution (section 11) being fixed
- RC-2 is independent and can be implemented standalone
- Interop features are foundational for stdlib implementation (stdlib functions are declared as externals)
