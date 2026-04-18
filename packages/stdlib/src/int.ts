/**
 * Int module — operations on integer values (JS numbers restricted to integer range).
 * Spec: docs/spec/11-stdlib/numeric.md.
 */

export const toString = (n: number): string => String(n);

export const toFloat = (n: number): number => n;

export const abs = (n: number): number => Math.abs(n) | 0;

export const max =
    (a: number) =>
    (b: number): number =>
        a > b ? a : b;

export const min =
    (a: number) =>
    (b: number): number =>
        a < b ? a : b;
