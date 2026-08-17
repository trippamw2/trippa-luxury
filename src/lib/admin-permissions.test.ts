import {
  ROLE_LEVEL,
  MODULE_MIN_ROLE,
  resolveEffectiveRole,
  isModuleAllowed,
  isRecord,
} from "@/lib/admin-permissions";

describe("admin permissions", () => {
  describe("ROLE_LEVEL", () => {
    it("orders roles: agent < editor < admin", () => {
      expect(ROLE_LEVEL.agent).toBe(1);
      expect(ROLE_LEVEL.editor).toBe(2);
      expect(ROLE_LEVEL.admin).toBe(3);
      expect(ROLE_LEVEL.agent).toBeLessThan(ROLE_LEVEL.editor);
      expect(ROLE_LEVEL.editor).toBeLessThan(ROLE_LEVEL.admin);
    });
  });

  describe("MODULE_MIN_ROLE defaults", () => {
    it("keeps finance, users, settings, audit-log admin-only", () => {
      const adminOnly = ["finance", "users", "settings", "audit-log"];
      adminOnly.forEach((m) => expect(MODULE_MIN_ROLE[m]).toBe("admin"));
    });

    it("lets agents manage guest-facing modules", () => {
      ["dashboard", "bookings", "inquiries", "guest-profiles", "tasks"].forEach((m) =>
        expect(MODULE_MIN_ROLE[m]).toBe("agent")
      );
    });

    it("gives editors content/operations modules", () => {
      ["properties", "packages", "journeys", "experiences", "destinations", "blog", "media", "marketing"].forEach(
        (m) => expect(MODULE_MIN_ROLE[m]).toBe("editor")
      );
    });
  });

  describe("isRecord", () => {
    it("true for plain objects, false for null/arrays/primitives", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: false })).toBe(true);
      expect(isRecord(null)).toBe(false);
      expect(isRecord([1, 2])).toBe(false);
      expect(isRecord("x")).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe("resolveEffectiveRole", () => {
    it("falls back to base role when permissions is not a record", () => {
      expect(resolveEffectiveRole("editor", "finance", null)).toBe("editor");
      expect(resolveEffectiveRole("editor", "finance", undefined)).toBe("editor");
      expect(resolveEffectiveRole("editor", "finance", "nope")).toBe("editor");
    });

    it("falls back to base role when module has no override", () => {
      expect(resolveEffectiveRole("admin", "unknown_module", {})).toBe("admin");
      expect(resolveEffectiveRole("agent", "tasks", { bookings: "admin" })).toBe("agent");
    });

    it("applies a role-string override (escalation)", () => {
      expect(resolveEffectiveRole("agent", "finance", { finance: "admin" })).toBe("admin");
    });

    it("applies a downgrade override", () => {
      expect(resolveEffectiveRole("admin", "finance", { finance: "agent" })).toBe("agent");
    });

    it("denies when override is explicitly false", () => {
      expect(resolveEffectiveRole("admin", "finance", { finance: false })).toBe("denied");
      expect(resolveEffectiveRole("agent", "tasks", { tasks: false })).toBe("denied");
    });

    it("ignores unrecognized override values and falls back to base", () => {
      expect(resolveEffectiveRole("admin", "finance", { finance: "superuser" })).toBe("admin");
      expect(resolveEffectiveRole("admin", "finance", { finance: 42 })).toBe("admin");
    });

    it("returns base role when module is undefined", () => {
      expect(resolveEffectiveRole("admin", undefined, { finance: false })).toBe("admin");
    });
  });

  describe("isModuleAllowed", () => {
    it("allows admin to access every module", () => {
      ["bookings", "finance", "users", "settings", "tasks", "blog"].forEach((m) =>
        expect(isModuleAllowed("admin", {}, m)).toBe(true)
      );
    });

    it("allows agents only on agent-level modules", () => {
      expect(isModuleAllowed("agent", {}, "bookings")).toBe(true);
      expect(isModuleAllowed("agent", {}, "tasks")).toBe(true);
      expect(isModuleAllowed("agent", {}, "finance")).toBe(false);
      expect(isModuleAllowed("agent", {}, "users")).toBe(false);
    });

    it("allows editors on editor-level modules and below", () => {
      expect(isModuleAllowed("editor", {}, "properties")).toBe(true);
      expect(isModuleAllowed("editor", {}, "bookings")).toBe(true); // agent-level <= editor
      expect(isModuleAllowed("editor", {}, "finance")).toBe(false);
    });

    it("respects an explicit allow override granting agent finance access", () => {
      // finance requires admin level; an override to admin grants the agent access
      expect(isModuleAllowed("agent", { finance: "admin" }, "finance")).toBe(true);
    });

    it("respects an explicit deny override even for admin", () => {
      expect(isModuleAllowed("admin", { finance: false }, "finance")).toBe(false);
    });

    it("allows a module not present in MODULE_MIN_ROLE (defaults to editor) for editor+ admins only", () => {
      expect(isModuleAllowed("admin", {}, "custom_module")).toBe(true);
      expect(isModuleAllowed("editor", {}, "custom_module")).toBe(true);
      expect(isModuleAllowed("agent", {}, "custom_module")).toBe(false);
    });
  });
});
