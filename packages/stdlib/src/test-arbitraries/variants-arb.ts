/**
 * fast-check arbitraries for Vibefun's stdlib variant types (Option, Result, List).
 *
 * Generators emit the same JS shape that Vibefun's codegen produces for
 * variants: `{ $tag, $0, $1, ... }`. Lists are built with the `Cons`/`Nil`
 * constructors so shrinking can shorten a list by re-applying `Nil`.
 */

import type { List, Option, Result } from "../variants.js";

import * as fc from "fast-check";

import { Cons, Err, Nil, None, Ok, Some } from "../variants.js";

export interface ListArbOptions {
    readonly maxLength?: number;
}

/**
 * Generate `Option<A>` from an element arbitrary. Half the time produces
 * `None`, half produces `Some(value)`.
 */
export const optionArb = <A>(elementArb: fc.Arbitrary<A>): fc.Arbitrary<Option<A>> =>
    fc.oneof(
        fc.constant(None as Option<A>),
        elementArb.map((value) => Some(value)),
    );

/**
 * Generate `Result<T, E>` from value and error arbitraries. Half/half.
 */
export const resultArb = <T, E>(valueArb: fc.Arbitrary<T>, errorArb: fc.Arbitrary<E>): fc.Arbitrary<Result<T, E>> =>
    fc.oneof(
        valueArb.map((value) => Ok<T, E>(value)),
        errorArb.map((error) => Err<T, E>(error)),
    );

/**
 * Generate `List<A>` from an element arbitrary. Uses `fc.array` to control the
 * length distribution and shrinking behaviour, then folds the JS array into
 * `Cons`/`Nil` so the result matches user-facing list shape.
 */
export const listArb = <A>(elementArb: fc.Arbitrary<A>, options: ListArbOptions = {}): fc.Arbitrary<List<A>> => {
    const constraints: fc.ArrayConstraints = options.maxLength === undefined ? {} : { maxLength: options.maxLength };
    return fc.array(elementArb, constraints).map((arr) => {
        let result: List<A> = Nil;
        for (let i = arr.length - 1; i >= 0; i--) {
            result = Cons(arr[i] as A)(result);
        }
        return result;
    });
};

/**
 * Convert a List to a plain array. Provided here for tests that compare List
 * results against array expectations without re-implementing the conversion.
 */
export const listToArray = <A>(list: List<A>): readonly A[] => {
    const out: A[] = [];
    let cur: List<A> = list;
    while (cur.$tag === "Cons") {
        out.push(cur.$0);
        cur = cur.$1;
    }
    return out;
};
