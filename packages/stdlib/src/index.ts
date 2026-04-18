import * as FloatNs from "./float.js";
import * as IntNs from "./int.js";
import * as ListNs from "./list.js";
import * as MathNs from "./math.js";
import * as OptionNs from "./option.js";
import * as ResultNs from "./result.js";
import * as StringNs from "./string.js";
import { Cons, Err, Nil, None, Ok, Some } from "./variants.js";

/**
 * @vibefun/std — Vibefun standard library runtime.
 *
 * Compiled Vibefun programs import from this package:
 *   import { String, List, Option, Result, Int, Float, Math } from "@vibefun/std";
 *
 * Variant constructors (Cons, Nil, Some, None, Ok, Err) are also exported for
 * direct use, but are kept ambient at the compiler level — programs don't need
 * to import them.
 *
 * The `__std__` aggregate is a compiler-reserved namespace used for desugarer-
 * synthesized references (e.g., list-spread's `concat`). User code should not
 * import or reference `__std__` directly.
 */

export const VERSION = "0.1.0";

export { Cons, Err, Nil, None, Ok, Some };
export type { Variant } from "./variants.js";

export const String = StringNs;
export const List = ListNs;
export const Option = OptionNs;
export const Result = ResultNs;
export const Int = IntNs;
export const Float = FloatNs;
export const Math = MathNs;

/**
 * Compiler-reserved aggregate namespace. Emitted by the codegen when the
 * desugarer references stdlib for synthesized code (list spread, etc.).
 * Not part of the user-facing API surface.
 */
export const __std__ = Object.freeze({
    String: StringNs,
    List: ListNs,
    Option: OptionNs,
    Result: ResultNs,
    Int: IntNs,
    Float: FloatNs,
    Math: MathNs,
    Cons,
    Nil,
    Some,
    None,
    Ok,
    Err,
} as const);
