# Group 8: Float Arithmetic & Comparison Operators

## Root Issue
Arithmetic operators (`+`, `-`, `*`, `%`) and comparison operators (`<`, `<=`, `>`, `>=`) are hardcoded to require `Int` operands in the typechecker. The `/` (divide) operator has special handling that supports both Int and Float (lowering to `IntDivide`/`FloatDivide`), but no other operator has this treatment. Unary negation (`-x`) is also restricted to Int.

## Affected Sections
04-expressions, 09-error-handling

## Affected Tests (count)
~8 tests directly (most also blocked by stdlib name resolution).

## Details
The typechecker's `getBinOpTypes` function hardcodes `Add`, `Subtract`, `Multiply`, `Modulo`, `LessThan`, `LessEqual`, `GreaterThan`, `GreaterEqual` to `Int`. The `Divide` operator's polymorphic handling can serve as a template for fixing the others.

The fix requires:
- Each operator to infer operand types first, then dispatch to Int or Float variant
- Potentially new operator variants in the core AST (e.g., `IntAdd`/`FloatAdd`)
- Updated codegen for Float-specific operator variants

## Individual Failures
- **04**: 4 tests (float addition, subtraction, multiplication, division -- though division may work via special handling)
- **09**: 3 tests (Infinity arithmetic, Infinity comparison), 1 test (float negation)

## Estimated Fix Scope
Medium (2-8 hours). The pattern already exists for Divide; it needs to be replicated for other operators.
