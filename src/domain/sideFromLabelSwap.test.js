import { describe, expect, it } from "vitest";
import { sideFromLabel } from "./handRoles.js";

describe("sideFromLabel", () => {
    it("maps Right to the left side when hand swapping is enabled", () => {
        expect(sideFromLabel("Right", true)).toBe("left");
    });
});
