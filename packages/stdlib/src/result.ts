/**
 * Result module — curried, data-first operations on Result<T, E>.
 * Spec: docs/spec/11-stdlib/result.md.
 */

import type { Result } from "./variants.js";

import { Err, Ok } from "./variants.js";

export const map =
    <T, E, U>(result: Result<T, E>) =>
    (fn: (t: T) => U): Result<U, E> =>
        result.$tag === "Ok" ? Ok(fn(result.$0)) : Err(result.$0);

export const flatMap =
    <T, E, U>(result: Result<T, E>) =>
    (fn: (t: T) => Result<U, E>): Result<U, E> =>
        result.$tag === "Ok" ? fn(result.$0) : Err(result.$0);

export const mapErr =
    <T, E, F>(result: Result<T, E>) =>
    (fn: (e: E) => F): Result<T, F> =>
        result.$tag === "Ok" ? Ok(result.$0) : Err(fn(result.$0));

export const isOk = <T, E>(result: Result<T, E>): boolean => result.$tag === "Ok";

export const isErr = <T, E>(result: Result<T, E>): boolean => result.$tag === "Err";

export const unwrap = <T, E>(result: Result<T, E>): T => {
    if (result.$tag === "Ok") return result.$0;
    throw new Error("Result.unwrap called on Err");
};

export const unwrapOr =
    <T, E>(result: Result<T, E>) =>
    (fallback: T): T =>
        result.$tag === "Ok" ? result.$0 : fallback;
