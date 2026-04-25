/**
 * Cross-path equivalence matrix for let-binding forms.
 *
 * PR #73 closed five copies of the same soundness invariants — one per
 * let-binding code path. Phase A of the simplification refactor extracted
 * those invariants into shared helpers; this matrix is the regression
 * safety net that guarantees every surface form continues to honour them
 * identically.
 *
 * The matrix is the Cartesian product of N scenarios × 6 forms, with each
 * scenario rendered through every form whose `requires` capabilities the
 * form `supports`. Divergence across paths surfaces as a failure on a
 * specific (scenario × form) cell — the flat-list output makes it
 * immediately scannable.
 *
 * **Adding a new let-binding form** (or refactoring a path)? Add it to
 * `forms` below. **Adding a new soundness scenario?** Add it to
 * `scenarios`. The grid stays exhaustive automatically.
 */

import type { TestResult } from "../framework/types.ts";

import { expectCompileError, expectCompiles, expectRunOutput } from "../framework/helpers.ts";
import { test } from "../framework/runner.ts";

const S = "07b-let-binding-matrix";

/**
 * A scenario describes one piece of let-binding semantics that must hold
 * uniformly across every form that supports it.
 */
type Scenario = {
    name: string;
    /** Capabilities the form must support for this scenario to apply. */
    requires: {
        /** The binding is `let mut`. */
        mutable: boolean;
        /** The binding is `let rec` (self-reference allowed). */
        recursive: boolean;
        /** The form must support a second binding (`and …`). */
        mutual: boolean;
    };
    /** RHS of the binding (`let [mut] [rec] x = <rhs>`). */
    rhs: string;
    /**
     * Statements that run after the binding is declared and use `x`. Each
     * entry is a single statement WITHOUT a trailing semicolon; the
     * renderer wraps bare expressions in `let _matrixSetupN = (...)` so
     * every Block-internal item is a `Let`.
     *
     * **Why the wrap:** vibefun's parser greedily consumes the
     * expression immediately following a `Let` into the Let's body, but
     * `desugarBlock` only writes the *value* of an inner Let — the
     * parsed body is dropped when the Let is followed by another sibling
     * expression in the block. Wrapping every setup as a Let chains them
     * correctly so nothing is silently lost.
     */
    setupStmts: string[];
    /**
     * String-typed expression evaluated last to produce the runOutput
     * value. Ignored for `compileError` scenarios.
     */
    outputExpr: string;
    /**
     * Optional second binding for mutual scenarios. When set, the form
     * must support `mutual: true`; otherwise the form may still append a
     * synthetic dummy binding to satisfy "rec-group" syntax.
     */
    second?: { name: string; mutable: boolean; rhs: string };
    expectation: { kind: "runOutput"; output: string } | { kind: "compileError"; code?: string };
};

type Form = {
    name: string;
    supports: { mutable: boolean; recursive: boolean; mutual: boolean };
    /** Render a complete vibefun program for this scenario via this form. */
    render: (scenario: Scenario) => string;
};

// --- helpers ---

const PREAMBLE = [
    'import { String, List, Option, Result, Int, Float, Math } from "@vibefun/std";',
    'external console_log: (String) -> Unit = "console.log";',
    "type Option<T> = Some(T) | None;",
].join("\n");

function bindingHeader(args: { mutable: boolean; recursive: boolean }): string {
    const parts = ["let"];
    if (args.recursive) parts.push("rec");
    if (args.mutable) parts.push("mut");
    return parts.join(" ");
}

function secondClause(second: NonNullable<Scenario["second"]>): string {
    const mutPart = second.mutable ? " mut" : "";
    return `and${mutPart} ${second.name} = ${second.rhs}`;
}

function bindingDecl(scenario: Scenario, opts: { recursive: boolean; group: boolean }): string {
    const header = bindingHeader({ mutable: scenario.requires.mutable, recursive: opts.recursive });
    if (opts.group) {
        const second = scenario.second ?? { name: "_matrixDummy", mutable: false, rhs: "0" };
        return `${header} x = ${scenario.rhs} ${secondClause(second)};`;
    }
    return `${header} x = ${scenario.rhs};`;
}

function setupBlock(scenario: Scenario): string {
    return scenario.setupStmts
        .map((stmt, i) => {
            const trimmed = stmt.trimStart();
            if (trimmed.startsWith("let ")) {
                return `${stmt};`;
            }
            return `let _matrixSetup${i} = (${stmt});`;
        })
        .join("\n");
}

function topLevelProgram(scenario: Scenario, opts: { recursive: boolean; group: boolean }): string {
    const lines = [PREAMBLE, bindingDecl(scenario, opts)];
    if (scenario.setupStmts.length > 0) {
        lines.push(setupBlock(scenario));
    }
    if (scenario.expectation.kind === "runOutput") {
        lines.push(`let _ = unsafe { console_log(${scenario.outputExpr}) };`);
    }
    return lines.join("\n");
}

function expressionProgram(scenario: Scenario, opts: { recursive: boolean; group: boolean }): string {
    // Build the inner block that hosts the let-expression: a sequence of
    // statements (terminated by `;`, including the final value
    // expression) wrapped in `{ }`.
    const innerLines = [bindingDecl(scenario, opts)];
    if (scenario.setupStmts.length > 0) {
        innerLines.push(setupBlock(scenario));
    }
    if (scenario.expectation.kind === "runOutput") {
        innerLines.push(`${scenario.outputExpr};`);
    } else {
        // For compileError scenarios the value is unobservable; supply a
        // throwaway int so the block typechecks as far as compilation
        // gets before the failure surfaces.
        innerLines.push("0;");
    }
    const body = innerLines.join("\n");
    const program = [PREAMBLE, `let _matrixOut = {\n${body}\n};`];
    if (scenario.expectation.kind === "runOutput") {
        program.push("let _ = unsafe { console_log(_matrixOut) };");
    }
    return program.join("\n");
}

// --- forms ---

const forms: Form[] = [
    {
        name: "top-let-nonrec",
        supports: { mutable: true, recursive: false, mutual: false },
        render: (scenario) => topLevelProgram(scenario, { recursive: false, group: false }),
    },
    {
        name: "top-let-rec-single",
        supports: { mutable: true, recursive: true, mutual: false },
        render: (scenario) => topLevelProgram(scenario, { recursive: true, group: false }),
    },
    {
        name: "top-let-rec-group",
        supports: { mutable: true, recursive: true, mutual: true },
        render: (scenario) => topLevelProgram(scenario, { recursive: true, group: true }),
    },
    {
        name: "expr-let-nonrec",
        supports: { mutable: true, recursive: false, mutual: false },
        render: (scenario) => expressionProgram(scenario, { recursive: false, group: false }),
    },
    {
        name: "expr-let-rec-single",
        supports: { mutable: true, recursive: true, mutual: false },
        render: (scenario) => expressionProgram(scenario, { recursive: true, group: false }),
    },
    // NOTE: there is no `expr-let-rec-group` surface form. The parser
    // only accepts `let rec x = … and y = …` at declaration scope, not
    // expression scope. `inferLetRecExpr` is reached *only* via internal
    // desugaring (e.g. while-loop lowering) — exercising it through
    // user-written source is not possible without a grammar change.
    // After Phase C, single `let rec x = … in body` still routes
    // through `inferLetRecExpr` (via the desugarer collapse).
];

// --- scenarios ---

const scenarios: Scenario[] = [
    {
        name: "polymorphic-id",
        requires: { mutable: false, recursive: false, mutual: false },
        rhs: "(a) => a",
        setupStmts: ["let _a = x(1)", 'let _b = x("ok")'],
        outputExpr: '"ok"',
        expectation: { kind: "runOutput", output: "ok" },
    },
    {
        name: "mutable-non-ref-rejected",
        requires: { mutable: true, recursive: false, mutual: false },
        rhs: "5",
        setupStmts: [],
        outputExpr: '"unreachable"',
        expectation: { kind: "compileError", code: "VF4018" },
    },
    {
        name: "mutable-ref-accepted",
        requires: { mutable: true, recursive: false, mutual: false },
        rhs: "ref(7)",
        setupStmts: [],
        outputExpr: "String.fromInt(!x)",
        expectation: { kind: "runOutput", output: "7" },
    },
    {
        name: "mutable-ref-aliased",
        requires: { mutable: true, recursive: false, mutual: false },
        rhs: "ref(0)",
        // Alias `b` to `x`, mutate `x`, observe through `b`.
        setupStmts: ["let mut b = x", "x := 1"],
        outputExpr: "String.fromInt(!b)",
        expectation: { kind: "runOutput", output: "1" },
    },
    {
        name: "polymorphic-ref-rejected",
        requires: { mutable: true, recursive: false, mutual: false },
        rhs: "ref(None)",
        // Two assignments at non-unifying element types. If `x` were
        // polymorphic over its element, both would type-check.
        setupStmts: ["x := Some(42)", 'x := Some("hello")'],
        outputExpr: '"unreachable"',
        expectation: { kind: "compileError" },
    },
    {
        name: "value-restriction-applied",
        requires: { mutable: true, recursive: false, mutual: false },
        rhs: "ref(None)",
        // Same shape — Int then Bool — exercises the restriction at a
        // different concrete pair.
        setupStmts: ["x := Some(42)", "x := Some(true)"],
        outputExpr: '"unreachable"',
        expectation: { kind: "compileError" },
    },
    {
        name: "recursive-self-reference",
        requires: { mutable: false, recursive: true, mutual: false },
        rhs: "(n: Int): Int => match n { | 0 => 1 | _ => n * x(n - 1) }",
        setupStmts: [],
        outputExpr: "String.fromInt(x(5))",
        expectation: { kind: "runOutput", output: "120" },
    },
    {
        name: "mutual-recursion",
        requires: { mutable: false, recursive: true, mutual: true },
        rhs: "(n: Int): Bool => match n { | 0 => true | _ => peer(n - 1) }",
        second: {
            name: "peer",
            mutable: false,
            rhs: "(n: Int): Bool => match n { | 0 => false | _ => x(n - 1) }",
        },
        setupStmts: [],
        outputExpr: "String.fromBool(x(4))",
        expectation: { kind: "runOutput", output: "true" },
    },
];

// --- registration ---

function appliesTo(scenario: Scenario, form: Form): boolean {
    if (scenario.requires.mutable && !form.supports.mutable) return false;
    if (scenario.requires.recursive && !form.supports.recursive) return false;
    if (scenario.requires.mutual && !form.supports.mutual) return false;
    return true;
}

function runScenarioOnForm(scenario: Scenario, form: Form): TestResult {
    const source = form.render(scenario);
    if (scenario.expectation.kind === "runOutput") {
        return expectRunOutput(source, scenario.expectation.output);
    }
    return expectCompileError(source, scenario.expectation.code);
}

for (const scenario of scenarios) {
    for (const form of forms) {
        if (!appliesTo(scenario, form)) continue;
        const name = `${scenario.name} × ${form.name}`;
        test(S, "07-mutable-references.md", name, () => runScenarioOnForm(scenario, form));
    }
}

// Mark `expectCompiles` as referenced — reserved for future scenarios that
// only need a "type-checks" assertion (no runtime value) without an
// expected error code.
void expectCompiles;
