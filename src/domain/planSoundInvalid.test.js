import { describe, expect, it } from "vitest";
import { planSound } from "./piano.js";

describe("planSound", () => {
    it("returns an empty sound plan when the note gesture is unsupported", () => {
        expect(planSound([false, false, false, false, false], [])).toEqual({ key: "", midi: [], roots: [], label: "" });
    });
});
