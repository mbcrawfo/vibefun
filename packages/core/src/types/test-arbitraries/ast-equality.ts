/**
 * Structural-equality utility for comparing AST round-trip results.
 *
 * Walks two values and compares them deeply, ignoring any property named
 * `loc`. The parser assigns fresh locations on every parse, so any
 * `parse(prettyPrint(ast)) ≡ ast` property must compare modulo `loc`.
 */

const IGNORE_KEYS = new Set(["loc"]);

export function astEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== "object") return false;

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!astEquals(a[i], b[i])) return false;
        }
        return true;
    }
    if (Array.isArray(b)) return false;

    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const aKeys = Object.keys(ao).filter((k) => !IGNORE_KEYS.has(k) && ao[k] !== undefined);
    const bKeys = Object.keys(bo).filter((k) => !IGNORE_KEYS.has(k) && bo[k] !== undefined);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
        if (!astEquals(ao[k], bo[k])) return false;
    }
    return true;
}
