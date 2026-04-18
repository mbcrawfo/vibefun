/**
 * Option module — curried, data-first operations on Option<A>.
 * Spec: docs/spec/11-stdlib/option.md.
 */

import type { Option } from "./variants.js";

import { None, Some } from "./variants.js";

export const map =
    <A, B>(opt: Option<A>) =>
    (fn: (a: A) => B): Option<B> =>
        opt.$tag === "Some" ? Some(fn(opt.$0)) : None();

export const flatMap =
    <A, B>(opt: Option<A>) =>
    (fn: (a: A) => Option<B>): Option<B> =>
        opt.$tag === "Some" ? fn(opt.$0) : None();

export const getOrElse =
    <A>(opt: Option<A>) =>
    (fallback: A): A =>
        opt.$tag === "Some" ? opt.$0 : fallback;

export const isSome = <A>(opt: Option<A>): boolean => opt.$tag === "Some";

export const isNone = <A>(opt: Option<A>): boolean => opt.$tag === "None";

export const unwrap = <A>(opt: Option<A>): A => {
    if (opt.$tag === "Some") return opt.$0;
    throw new Error("Option.unwrap called on None");
};
