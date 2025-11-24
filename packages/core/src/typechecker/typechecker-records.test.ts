/**
 * Record type checking tests
 * Tests record construction, access, updates, and pattern matching
 */

import { describe, expect, it } from "vitest";

import { createModule, testLoc } from "./typechecker-test-helpers.js";
import { typeCheck } from "./typechecker.js";

describe("typeCheck - Records", () => {
    it("should type check record construction and access", () => {
        // Note: Multiple declarations can't reference each other (no shared env)
        // let person = { name: "Alice", age: 30 }
        // let name = person.name
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Alice",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 30,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "name",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecordAccess",
                    record: {
                        kind: "CoreVar",
                        name: "person",
                        loc: testLoc,
                    },
                    field: "name",
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("name")).toBe(true);

        const personType = result.declarationTypes.get("person");
        const nameType = result.declarationTypes.get("name");

        expect(personType?.type).toBe("Record");
        expect(nameType).toMatchObject({ type: "Const", name: "String" });
    });

    it("should type check record with field access", () => {
        // let point = { x: 10, y: 20 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "point",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "x",
                            value: {
                                kind: "CoreIntLit",
                                value: 10,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "y",
                            value: {
                                kind: "CoreIntLit",
                                value: 20,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("point")).toBe(true);
        const pointType = result.declarationTypes.get("point");
        expect(pointType?.type).toBe("Record");
        if (pointType?.type === "Record") {
            expect(pointType.fields.has("x")).toBe(true);
            expect(pointType.fields.has("y")).toBe(true);
        }
    });

    it("should type check record pattern matching", () => {
        // Tests record field access on polymorphic lambda parameters
        // Type variable is constrained to be a record type when field is accessed
        // let getName = (p) => p.name
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Bob",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 25,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "getName",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreLambda",
                    param: {
                        kind: "CoreVarPattern",
                        name: "p",
                        loc: testLoc,
                    },
                    body: {
                        kind: "CoreRecordAccess",
                        record: {
                            kind: "CoreVar",
                            name: "p",
                            loc: testLoc,
                        },
                        field: "name",
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("getName")).toBe(true);
    });

    it("should type check record update expressions", () => {
        // Note: Multiple declarations can't reference each other (no shared env)
        // let person = { name: "Charlie", age: 40 }
        // let updated = { ...person, age: 41 }
        const module = createModule([
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "person",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecord",
                    fields: [
                        {
                            kind: "Field",
                            name: "name",
                            value: {
                                kind: "CoreStringLit",
                                value: "Charlie",
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 40,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
            {
                kind: "CoreLetDecl",
                pattern: {
                    kind: "CoreVarPattern",
                    name: "updated",
                    loc: testLoc,
                },
                value: {
                    kind: "CoreRecordUpdate",
                    record: {
                        kind: "CoreVar",
                        name: "person",
                        loc: testLoc,
                    },
                    updates: [
                        {
                            kind: "Field",
                            name: "age",
                            value: {
                                kind: "CoreIntLit",
                                value: 41,
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                exported: true,
                loc: testLoc,
            },
        ]);

        const result = typeCheck(module);

        expect(result.declarationTypes.has("person")).toBe(true);
        expect(result.declarationTypes.has("updated")).toBe(true);

        const personType = result.declarationTypes.get("person");
        const updatedType = result.declarationTypes.get("updated");

        expect(personType?.type).toBe("Record");
        expect(updatedType?.type).toBe("Record");
    });
});
