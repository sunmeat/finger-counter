import { describe, expect, it } from "vitest";
import { sideFromLabel } from "./handRoles.js";

describe("sideFromLabel", () => {
    it("maps the Left label to the left side by default", () => {
        expect(sideFromLabel("Left")).toBe("left");
    });
});
