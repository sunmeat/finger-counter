import { describe, expect, it } from "vitest";
import { planSound } from "./piano.js";

describe("planSound", () => {
    it("builds the expected MIDI notes for C major", () => {
        expect(planSound([true, false, false, false, false], [true, false, false, false, false])).toMatchObject({
            key: "60,64,67",
            midi: [60, 64, 67],
            roots: [60],
            label: "до мажор",
        });
    });
});
