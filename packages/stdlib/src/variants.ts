/**
 * Variant constructors for Vibefun's algebraic data types.
 *
 * Vibefun's codegen emits variants as objects of the shape `{ $tag, $0, $1, ... }`.
 * These helpers produce matching shapes so hand-written JS interop or synthesized
 * compiler references can construct variants without duplicating the layout.
 *
 * Arity-0 variants (`None`, `Nil`) are exported as singleton values, matching the
 * codegen for user-defined zero-arg variants (e.g. `type Color = Red | ...` emits
 * `const Red = { $tag: "Red" };`). User code that writes `let x = None;` therefore
 * binds `x` to the variant instance, so `Option.isNone(x)` and pattern matching
 * both observe the expected `$tag === "None"`.
 */

export type Variant = { $tag: string; [k: `$${number}`]: unknown };

export type ConsNode<A> = { $tag: "Cons"; $0: A; $1: List<A> };
export type NilNode = { $tag: "Nil" };
export type List<A> = ConsNode<A> | NilNode;

export type SomeNode<A> = { $tag: "Some"; $0: A };
export type NoneNode = { $tag: "None" };
export type Option<A> = SomeNode<A> | NoneNode;

export type OkNode<T> = { $tag: "Ok"; $0: T };
export type ErrNode<E> = { $tag: "Err"; $0: E };
export type Result<T, E> = OkNode<T> | ErrNode<E>;

export const Cons =
    <A>(head: A) =>
    (tail: List<A>): List<A> => ({ $tag: "Cons", $0: head, $1: tail });

export const Nil: List<never> = { $tag: "Nil" };

export const Some = <A>(value: A): Option<A> => ({ $tag: "Some", $0: value });

export const None: Option<never> = { $tag: "None" };

export const Ok = <T, E>(value: T): Result<T, E> => ({ $tag: "Ok", $0: value });

export const Err = <T, E>(error: E): Result<T, E> => ({ $tag: "Err", $0: error });
