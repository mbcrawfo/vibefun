# 12 - Compilation: Spec Validation Analysis

## Summary

Section 12 covers desugaring transformations and code generation -- the final stages that turn the core AST into executable JavaScript. Of 15 tests, 3 pass and 12 fail (the task description indicated 15 failures and 0 passes, but current results show 3 passing: "string & operator desugars correctly", "compiles to JavaScript successfully", and "generated JS is valid and executable"). The failures stem from four distinct root causes, each a missing or incomplete feature in the compiler pipeline. The most impactful issue is the inability to resolve standard library module-qualified functions (e.g., `String.fromInt`, `List.length`), which accounts for 10 of the 12 failures. The remaining failures involve unimplemented variant constructor registration, missing multi-argument call desugaring, and multiple compounding issues with while loops.

## Failure Categories

### Category 1: Standard Library Module-Qualified Functions Inaccessible

- **Tests affected:** multi-param lambda desugars to curried form, partial application works after desugaring, functions compile to callable JS, records compile to JS objects, lists compile and operate correctly, list literal desugars and supports cons prepend, pipe operator chains desugar correctly, composition desugars to lambda, record update desugars preserving fields (9 tests, plus partial overlap with "functions compile to callable JS")
- **Root cause:** Standard library functions are registered in the type environment with dotted names as single keys (e.g., `"String.fromInt"`, `"List.length"` in `/workspace/packages/core/src/typechecker/builtins.ts`). However, the parser produces a `RecordAccess(Var("String"), "fromInt")` AST node for `String.fromInt(42)`. The typechecker resolves `Var("String")` first via `ctx.env.values.get("String")`, which returns undefined because only `"String.fromInt"` exists as a key -- there is no `"String"` module object in the environment. This causes error VF4100: "Undefined variable 'String'". The underlying features being tested (currying, pipes, composition, records, lists) all work correctly at the compilation and code generation level, but the tests use `String.fromInt()` or `List.length()` to produce observable output, making them fail.
- **Spec reference:** `12-compilation/codegen.md` (value representations), `11-stdlib/string.md` and `11-stdlib/list.md` (standard library API)
- **Scope estimate:** Medium (2-8 hours) -- requires either (a) implementing module namespace objects so `String` resolves to a record/module with `fromInt` as a field, or (b) adding a resolution pass that recognizes `RecordAccess(Var("String"), "fromInt")` as a builtin lookup for `"String.fromInt"`, or (c) implementing the actual stdlib as importable `.vf` modules with `external` declarations
- **Complexity:** Medium -- touches type environment construction, variable resolution, and potentially code generation for stdlib functions
- **Notes:** The stdlib package (`/workspace/packages/stdlib/src/index.ts`) is a placeholder with no implementation. The builtins approach of registering dotted names was likely a temporary measure that was never connected to the parser/typechecker's name resolution. Most section 12 failures would be unblocked by fixing this single issue. As a workaround, tests could use inline `external` declarations (e.g., `external intToStr: (Int) -> String = "(n) => String(n)"`), but that has its own bug (see notes under Category 3).

### Category 2: Variant Constructor Registration Missing

- **Tests affected:** pattern matching compiles correctly, variant constructors compile correctly
- **Root cause:** When a `type` declaration defines a variant type (e.g., `type Color = Red | Green | Blue`), the constructors (`Red`, `Green`, `Blue`) are never registered as value bindings in the type environment. In `/workspace/packages/core/src/typechecker/typechecker.ts` (line 241-244), `CoreTypeDecl` returns the environment unchanged with the comment "Type declarations are already processed in buildEnvironment." However, `buildEnvironment` in `/workspace/packages/core/src/typechecker/environment.ts` only processes external declarations (line 128 has `// TODO: Handle other declaration types`). As a result, using a constructor like `Green` as an expression produces VF4100 ("Undefined variable 'Green'"), and using `Circle(r)` in a pattern produces VF4102 ("Undefined constructor 'Circle'").
- **Spec reference:** `12-compilation/codegen.md` (variant types, constructor identity), `03-type-system/variant-types.md`
- **Scope estimate:** Medium (2-8 hours) -- requires implementing constructor registration during type checking, mapping each constructor to a function type (e.g., `Circle: (Float) -> Shape`) or nullary value (e.g., `Green: Color`), and making the pattern matcher aware of registered constructors
- **Complexity:** Medium -- involves coordinating type declaration processing, environment updates, and pattern matching infrastructure
- **Notes:** This is a fundamental type system feature. Without variant constructor support, algebraic data types (a core language feature) are unusable. The codegen already has infrastructure for variant representation using tagged objects (`{ $tag: "Cons", $0: value, ... }`), so the gap is primarily in the typechecker.

### Category 3: Multi-Argument Call Desugaring Missing

- **Tests affected:** functions compile to callable JS (also affected by stdlib issue)
- **Root cause:** The spec at `12-compilation/desugaring.md` states that `f(a, b)` should be desugared to `((f(a))(b))`. Multi-parameter lambdas ARE correctly desugared to curried form (e.g., `(a, b) => a + b` becomes `(a) => (b) => a + b`). However, multi-argument function calls are NOT desugared to curried calls. In `/workspace/packages/core/src/desugarer/desugarer.ts` (line 157-163), the `App` case simply passes through all arguments as `CoreApp.args[]` without currying them. The typechecker's `inferApp` in `/workspace/packages/core/src/typechecker/infer/infer-functions.ts` then constructs an expected type `(Int, Int) -> ?` and tries to unify it with the curried function type `(Int) -> (Int) -> Int`, producing error VF4021: "Cannot unify functions with different arity: 1 vs 2". The code generator's `emitApp` only uses `args[0]`, confirming the expectation that calls should be single-argument in the core AST. Curried calls (`add(10)(20)`) work correctly; only the multi-arg sugar is broken.
- **Spec reference:** `12-compilation/desugaring.md` (multi-argument function desugaring: `f(a, b)` to `((f(a))(b))`)
- **Scope estimate:** Small (1-2 hours) -- the desugarer needs to transform `App { func, args: [a, b, c] }` into nested single-arg `CoreApp` nodes: `CoreApp(CoreApp(CoreApp(func, a), b), c)`. The codegen already handles single-arg apps correctly.
- **Complexity:** Low -- straightforward transformation in the desugarer's `App` case
- **Notes:** There is also an existing unit test (`desugarer.test.ts` line 225) that explicitly expects multi-arg `CoreApp` with 2 args, which contradicts the spec's desugaring rule. This test would need to be updated. An additional related issue: when external functions with lambda JS bodies (e.g., `external intToStr: (Int) -> String = "(n) => String(n)"`) are called, the codegen inlines the JS body instead of calling it, producing `(n) => String(n)(result)` instead of `intToStr(result)` or `((n) => String(n))(result)`. This is a separate codegen bug but compounds testing difficulties.

### Category 4: While Loop -- Multiple Compounding Issues

- **Tests affected:** while loop desugars correctly
- **Root cause:** This test has at least three independent issues that prevent it from working:
  1. **Top-level `while` not allowed:** The parser's `parseDeclaration` (in `/workspace/packages/core/src/parser/parse-declarations.ts` line 143-154) only handles `let`, `type`, `external`, and `import` at the top level. `while` is parsed as an expression (in `parse-expression-primary.ts` line 174), so it can only appear inside an expression context (e.g., `let _ = while ... { ... };`). The test writes `while !i < 5 { ... };` at the top level, producing error VF2001: "Unexpected keyword in declaration: while".
  2. **Prefix `!` for deref vs postfix `!`:** The test uses `!i` (prefix) for dereference, matching the spec (`07-mutable-references.md`). However, the compiler implements dereference as postfix `i!` (in `parse-expression-operators.ts` line 570). Prefix `!` is parsed as boolean NOT, so `!i < 5` with a `Ref<Int>` produces a type error (VF4024: "Cannot unify types: Ref<Int> with Bool").
  3. **Wildcard pattern in let-bindings not supported:** The while loop desugars to a recursive `CoreLet` with `CoreWildcardPattern` (in `desugarer.ts` line 364). The typechecker's `inferLet` (in `infer-bindings.ts` line 71-75) only supports `CoreVarPattern`, throwing VF4017: "Pattern matching in let-bindings not yet implemented" for any other pattern kind.
  4. **Mutable let-binding type checking partially implemented:** While `let mut x = ref(0)` compiles at the top level via the declaration path, the while loop body contains `:=` ref-assignment operations that require the full mutable references type inference pipeline.
- **Spec reference:** `12-compilation/desugaring.md` (while loop desugaring), `04-expressions/control-flow.md`, `07-mutable-references.md`
- **Scope estimate:** Large (1-3 days) -- requires fixes across parser (top-level expression statements or while-as-declaration), typechecker (wildcard patterns in let, mutable bindings), and potentially a resolution of the prefix vs postfix deref syntax disagreement
- **Complexity:** High -- multiple independent issues across different compiler phases, plus a spec-vs-implementation conflict on deref syntax
- **Notes:** The prefix `!` vs postfix `!` for dereference is a spec-implementation disagreement that affects tests beyond this section (see section 07-mutable-references analysis). The spec shows `!counter` (prefix) while the compiler expects `counter!` (postfix). This needs a design decision before implementation can proceed.

## Dependencies

- **Stdlib module system (Category 1)** depends on a decision about how module-qualified names (`String.fromInt`, `List.length`) should be resolved -- either through a module/namespace system, a special resolution pass, or actual stdlib module files.
- **Variant constructors (Category 2)** are foundational for pattern matching (section 05) and error handling (section 09). Many tests in other sections also fail because of this.
- **Multi-arg call desugaring (Category 3)** is required for the idiomatic calling convention described in the spec. Without it, users must write `add(10)(20)` instead of `add(10, 20)`.
- **While loops (Category 4)** depend on wildcard/destructuring patterns in let-bindings, mutable reference type checking, and a resolution of the prefix vs postfix deref syntax.
- **External function call codegen bug** (noted under Category 3): External functions with lambda JS bodies are inlined incorrectly during code generation. This is a separate bug from the desugaring issue but would affect tests that try to work around the stdlib issue using inline externals.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Stdlib module-qualified functions inaccessible | 9 | Dotted builtin names (e.g., `"String.fromInt"`) not reachable via `RecordAccess(Var("String"), "fromInt")` AST | Medium | Medium |
| Variant constructor registration missing | 2 | `CoreTypeDecl` processing is a no-op; constructors never added to type environment | Medium | Medium |
| Multi-argument call desugaring missing | 1 | `f(a, b)` not desugared to `f(a)(b)` despite lambda currying | Small | Low |
| While loop -- multiple compounding issues | 1 | Top-level while not allowed + prefix/postfix deref conflict + wildcard patterns in let unsupported | Large | High |

Note: One test ("functions compile to callable JS") is affected by both Category 1 (stdlib) and Category 3 (multi-arg calls) and is counted under Category 3 as the primary cause. Total unique failing tests: 12.
