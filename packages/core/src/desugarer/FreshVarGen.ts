/**
 * Fresh variable generator for desugaring transformations
 */

export class FreshVarGen {
    private counter = 0;
    private genericScope: string[][] = [];

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
     * Push a lambda's explicit type-parameter names onto the in-scope
     * generics stack. Callers must pair every push with a pop so the
     * scope stays balanced across recursive descent.
     */
    pushGenerics(names: readonly string[]): void {
        this.genericScope.push([...names]);
    }

    /**
     * Pop the most recently pushed generic-names frame.
     */
    popGenerics(): void {
        this.genericScope.pop();
    }

    /**
     * True when `name` is a type-parameter name introduced by the current
     * lambda or any enclosing lambda whose body we are still inside.
     */
    isGenericInScope(name: string): boolean {
        for (const frame of this.genericScope) {
            if (frame.includes(name)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Reset the counter (useful for testing)
     */
    reset(): void {
        this.counter = 0;
        this.genericScope = [];
    }
}
