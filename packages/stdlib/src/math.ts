/**
 * Math module — mathematical functions and constants on Float.
 * Spec: docs/spec/11-stdlib/math.md.
 *
 * Minimal set for Phase 2.1 (matches what's called by current spec-validation
 * tests via external blocks). Phase 2.7 expands to the full spec surface.
 */

export const sqrt = (n: number): number => Math.sqrt(n);

export const floor = (n: number): number => Math.floor(n);

export const ceil = (n: number): number => Math.ceil(n);

export const abs = (n: number): number => Math.abs(n);
