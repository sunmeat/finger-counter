import { describe, expect, it } from "vitest";
import { fixSides } from "./handRoles.js";

describe("fixSides", () => {
    it("assigns the right side to the hand with the smaller wrist x coordinate", () => {
        const hands = [
            { side: "left", wristX: 0.2 },
            { side: "left", wristX: 0.8 },
        ];

        fixSides(hands);

        expect(hands.map(({ side }) => side)).toEqual(["right", "left"]);
    });
});
