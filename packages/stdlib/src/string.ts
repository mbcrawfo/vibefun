/**
 * String module — curried operations on Vibefun's primitive String type.
 * Spec: docs/spec/11-stdlib/string.md.
 */

import type { List, Option } from "./variants.js";

import { Cons, Nil, None, Some } from "./variants.js";

export const length = (s: string): number => [...s].length;

export const concat =
    (a: string) =>
    (b: string): string =>
        a + b;

export const fromInt = (n: number): string => String(n);

export const fromFloat = (n: number): string => {
    if (Number.isFinite(n) && Math.floor(n) === n) return n.toFixed(1).replace(/\.0$/, "");
    return String(n);
};

export const toUpperCase = (s: string): string => s.toUpperCase();

export const toLowerCase = (s: string): string => s.toLowerCase();

export const trim = (s: string): string => s.trim();

export const split =
    (s: string) =>
    (sep: string): List<string> => {
        const parts = s.split(sep);
        let result: List<string> = Nil<string>();
        for (let i = parts.length - 1; i >= 0; i--) {
            result = Cons(parts[i] as string)(result);
        }
        return result;
    };

export const contains =
    (s: string) =>
    (substr: string): boolean =>
        s.includes(substr);

export const startsWith =
    (s: string) =>
    (prefix: string): boolean =>
        s.startsWith(prefix);

export const endsWith =
    (s: string) =>
    (suffix: string): boolean =>
        s.endsWith(suffix);

export const toInt = (s: string): Option<number> => {
    if (!/^-?\d+$/.test(s.trim())) return None();
    const n = Number(s);
    return Number.isSafeInteger(n) ? Some(n) : None();
};

export const toFloat = (s: string): Option<number> => {
    const trimmed = s.trim();
    if (trimmed === "") return None();
    const n = Number(trimmed);
    return Number.isFinite(n) ? Some(n) : None();
};
