import { describe, expect, it } from "vitest";

import * as StdLib from "./index.js";

describe("@vibefun/std index", () => {
    it("exports VERSION", () => {
        expect(StdLib.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("exposes per-module namespaces", () => {
        expect(typeof StdLib.String.fromInt).toBe("function");
        expect(typeof StdLib.List.map).toBe("function");
        expect(typeof StdLib.Option.map).toBe("function");
        expect(typeof StdLib.Result.map).toBe("function");
        expect(typeof StdLib.Int.abs).toBe("function");
        expect(typeof StdLib.Float.abs).toBe("function");
        expect(typeof StdLib.Math.sqrt).toBe("function");
    });

    it("exposes top-level variant constructors", () => {
        expect(StdLib.Some(1)).toEqual({ $tag: "Some", $0: 1 });
        expect(StdLib.None).toEqual({ $tag: "None" });
        expect(StdLib.Ok(1)).toEqual({ $tag: "Ok", $0: 1 });
        expect(StdLib.Err("bad")).toEqual({ $tag: "Err", $0: "bad" });
        expect(StdLib.Nil).toEqual({ $tag: "Nil" });
        expect(StdLib.Cons(1)(StdLib.Nil)).toEqual({
            $tag: "Cons",
            $0: 1,
            $1: { $tag: "Nil" },
        });
    });

    it("__std__ aggregate carries every module and every variant constructor", () => {
        const aggregate = StdLib.__std__;
        expect(aggregate.String).toBe(StdLib.String);
        expect(aggregate.List).toBe(StdLib.List);
        expect(aggregate.Option).toBe(StdLib.Option);
        expect(aggregate.Result).toBe(StdLib.Result);
        expect(aggregate.Int).toBe(StdLib.Int);
        expect(aggregate.Float).toBe(StdLib.Float);
        expect(aggregate.Math).toBe(StdLib.Math);
        expect(aggregate.Cons).toBe(StdLib.Cons);
        expect(aggregate.Nil).toBe(StdLib.Nil);
        expect(aggregate.Some).toBe(StdLib.Some);
        expect(aggregate.None).toBe(StdLib.None);
        expect(aggregate.Ok).toBe(StdLib.Ok);
        expect(aggregate.Err).toBe(StdLib.Err);
    });

    it("__std__ aggregate is frozen so user code can't corrupt compiler-synthesized references", () => {
        expect(Object.isFrozen(StdLib.__std__)).toBe(true);
    });
});
