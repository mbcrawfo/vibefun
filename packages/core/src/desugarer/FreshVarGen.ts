/**
 * Fresh variable generator for desugaring transformations
 */

export class FreshVarGen {
    private counter = 0;

    /**
     * Generate a fresh variable name with given prefix
     *
     * @param prefix - Prefix for the variable name (default: "tmp")
     * @returns A fresh variable name like "$tmp0", "$composed1", etc.
     *
     * @example
     * const gen = new FreshVarGen();
     * gen.fresh("composed"); // => "$composed0"
     * gen.fresh("composed"); // => "$composed1"
     */
    fresh(prefix: string = "tmp"): string {
        return `$${prefix}${this.counter++}`;
    }

    /**
     * Reset the counter (useful for testing)
     */
    reset(): void {
        this.counter = 0;
    }
}
