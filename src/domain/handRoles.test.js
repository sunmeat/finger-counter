import { describe, expect, it } from "vitest";
import { sideFromLabel } from "./handRoles.js";

describe("sideFromLabel", () => {
    it("maps the Right label to the right side by default", () => {
        expect(sideFromLabel("Right")).toBe("right");
    });
});
