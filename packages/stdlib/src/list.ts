/**
 * List module — operations on Vibefun's singly-linked immutable List type.
 *
 * All functions are curried and data-first per spec §11-stdlib/list.md. A raw
 * JavaScript call site looks like `List.map(xs)(fn)`, matching the shape that
 * Phase 1.2's multi-arg desugaring produces.
 */

import type { List, Option } from "./variants.js";

import { Cons, Nil, None, Some } from "./variants.js";

const buildFromArray = <A>(items: A[]): List<A> => {
    let result: List<A> = Nil;
    for (let i = items.length - 1; i >= 0; i--) {
        result = Cons(items[i] as A)(result);
    }
    return result;
};

export const map =
    <A, B>(list: List<A>) =>
    (fn: (a: A) => B): List<B> => {
        const out: B[] = [];
        let cur: List<A> = list;
        while (cur.$tag === "Cons") {
            out.push(fn(cur.$0));
            cur = cur.$1;
        }
        return buildFromArray(out);
    };

export const filter =
    <A>(list: List<A>) =>
    (pred: (a: A) => boolean): List<A> => {
        const kept: A[] = [];
        let cur: List<A> = list;
        while (cur.$tag === "Cons") {
            if (pred(cur.$0)) kept.push(cur.$0);
            cur = cur.$1;
        }
        return buildFromArray(kept);
    };

export const fold =
    <A, B>(list: List<A>) =>
    (init: B) =>
    (fn: (acc: B) => (x: A) => B): B => {
        let acc: B = init;
        let cur: List<A> = list;
        while (cur.$tag === "Cons") {
            acc = fn(acc)(cur.$0);
            cur = cur.$1;
        }
        return acc;
    };

export const foldRight =
    <A, B>(list: List<A>) =>
    (init: B) =>
    (fn: (x: A) => (acc: B) => B): B => {
        const items: A[] = [];
        let cur: List<A> = list;
        while (cur.$tag === "Cons") {
            items.push(cur.$0);
            cur = cur.$1;
        }
        let acc = init;
        for (let i = items.length - 1; i >= 0; i--) {
            acc = fn(items[i] as A)(acc);
        }
        return acc;
    };

export const length = <A>(list: List<A>): number => {
    let n = 0;
    let cur: List<A> = list;
    while (cur.$tag === "Cons") {
        n++;
        cur = cur.$1;
    }
    return n;
};

export const head = <A>(list: List<A>): Option<A> => (list.$tag === "Cons" ? Some(list.$0) : None);

export const tail = <A>(list: List<A>): Option<List<A>> => (list.$tag === "Cons" ? Some(list.$1) : None);

export const reverse = <A>(list: List<A>): List<A> => {
    let result: List<A> = Nil;
    let cur: List<A> = list;
    while (cur.$tag === "Cons") {
        result = Cons(cur.$0)(result);
        cur = cur.$1;
    }
    return result;
};

export const concat =
    <A>(xs: List<A>) =>
    (ys: List<A>): List<A> => {
        const items: A[] = [];
        let cur: List<A> = xs;
        while (cur.$tag === "Cons") {
            items.push(cur.$0);
            cur = cur.$1;
        }
        let result: List<A> = ys;
        for (let i = items.length - 1; i >= 0; i--) {
            result = Cons(items[i] as A)(result);
        }
        return result;
    };

export const flatten = <A>(xss: List<List<A>>): List<A> => {
    // Collect all elements into an array, preserving order, then rebuild.
    const items: A[] = [];
    let outer: List<List<A>> = xss;
    while (outer.$tag === "Cons") {
        let inner: List<A> = outer.$0;
        while (inner.$tag === "Cons") {
            items.push(inner.$0);
            inner = inner.$1;
        }
        outer = outer.$1;
    }
    return buildFromArray(items);
};
