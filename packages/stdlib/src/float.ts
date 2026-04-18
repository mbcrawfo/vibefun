/**
 * Float module — operations on floating-point values.
 * Spec: docs/spec/11-stdlib/numeric.md.
 *
 * Float.toString mirrors String.fromFloat to keep whole-number floats readable
 * ("1" not "1.0") while preserving fractional part for non-integers.
 */

export const toString = (n: number): string => {
    if (Number.isFinite(n) && Math.floor(n) === n) return n.toFixed(1).replace(/\.0$/, "");
    return String(n);
};

export const toInt = (n: number): number => Math.trunc(n);

export const round = (n: number): number => {
    if (n >= 0) return Math.round(n);
    const abs = Math.abs(n);
    return -Math.round(abs);
};

export const floor = (n: number): number => Math.floor(n);

export const ceil = (n: number): number => Math.ceil(n);

export const abs = (n: number): number => Math.abs(n);
