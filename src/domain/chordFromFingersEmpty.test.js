import { describe, expect, it } from "vitest";
import { chordFromFingers } from "./piano.js";

describe("chordFromFingers", () => {
    it("maps no raised chord fingers to a single note", () => {
        expect(chordFromFingers([])).toMatchObject({ name: "одна нота", intervals: [0] });
    });
});
