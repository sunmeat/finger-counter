import { describe, expect, it } from "vitest";
import { rolesFor } from "./handRoles.js";

describe("rolesFor", () => {
    it("assigns notes to the right and chords to the left for left dominance", () => {
        expect(rolesFor("left")).toEqual({ noteSide: "right", chordSide: "left" });
    });
});
