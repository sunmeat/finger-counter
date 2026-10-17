import { describe, expect, it } from "vitest";
import { getNoteByFingers } from "./piano.js";

describe("getNoteByFingers", () => {
    it("maps the thumb-only gesture to C4", () => {
        expect(getNoteByFingers([true, false, false, false, false])).toMatchObject({
            name: "до",
            midi: 60,
        });
    });
});
