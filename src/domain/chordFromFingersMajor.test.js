import { describe, expect, it } from "vitest";
import { chordFromFingers } from "./piano.js";

describe("chordFromFingers", () => {
    it("maps the thumb-only chord gesture to a major chord", () => {
        expect(chordFromFingers([true, false, false, false, false])).toMatchObject({ name: "мажор", intervals: [0, 4, 7] });
    });
});
