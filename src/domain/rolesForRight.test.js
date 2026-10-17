import { describe, expect, it } from "vitest";
import { rolesFor } from "./handRoles.js";

describe("rolesFor", () => {
    it("assigns notes to the left and chords to the right for right dominance", () => {
        expect(rolesFor("right")).toEqual({ noteSide: "left", chordSide: "right" });
    });
});
