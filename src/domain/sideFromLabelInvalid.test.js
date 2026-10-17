import { describe, expect, it } from "vitest";
import { sideFromLabel } from "./handRoles.js";

describe("sideFromLabel", () => {
    it("returns null for an unsupported label", () => {
        expect(sideFromLabel("Unknown")).toBeNull();
    });
});
