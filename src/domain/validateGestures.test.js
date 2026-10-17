import { describe, expect, it } from "vitest";
import { validateGestures } from "./customGestures.js";

describe("validateGestures", () => {
    it("reports repeated hand and finger combinations", () => {
        const gestures = [
            { side: "left", mask: "10000" },
            { side: "left", mask: "10000" },
        ];

        expect(validateGestures(gestures)).toEqual(new Set(["left:10000"]));
    });
});
