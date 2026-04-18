/**
 * Math module — mathematical functions and constants on Float.
 * Spec: docs/spec/11-stdlib/math.md.
 *
 * Note: `random` is impure and must be invoked inside an `unsafe {}` block
 * at the Vibefun level; the runtime function is unqualified here.
 */

export const pi: number = Math.PI;
export const e: number = Math.E;

export const sin = (n: number): number => Math.sin(n);
export const cos = (n: number): number => Math.cos(n);
export const tan = (n: number): number => Math.tan(n);
export const asin = (n: number): number => Math.asin(n);
export const acos = (n: number): number => Math.acos(n);
export const atan = (n: number): number => Math.atan(n);
export const atan2 =
    (y: number) =>
    (x: number): number =>
        Math.atan2(y, x);

export const exp = (n: number): number => Math.exp(n);
export const log = (n: number): number => Math.log(n);
export const log10 = (n: number): number => Math.log10(n);
export const log2 = (n: number): number => Math.log2(n);
export const pow =
    (base: number) =>
    (exponent: number): number =>
        Math.pow(base, exponent);
export const sqrt = (n: number): number => Math.sqrt(n);

export const round = (n: number): number => Math.round(n);
export const floor = (n: number): number => Math.floor(n);
export const ceil = (n: number): number => Math.ceil(n);
export const trunc = (n: number): number => Math.trunc(n);

export const abs = (n: number): number => Math.abs(n);
export const sign = (n: number): number => Math.sign(n);
export const min =
    (a: number) =>
    (b: number): number =>
        Math.min(a, b);
export const max =
    (a: number) =>
    (b: number): number =>
        Math.max(a, b);

export const random = (): number => Math.random();
