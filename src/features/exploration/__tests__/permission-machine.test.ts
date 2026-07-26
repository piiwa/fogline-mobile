import { deriveMode, nextAction } from "../engine/permission-machine";
import { PERM_ACTION, PERM_MODE, PERM_STATUS } from "../engine/permission.types";

describe("permission-machine", () => {
  it("both granted → full mode, no further action", () => {
    const s = { foreground: PERM_STATUS.Granted, background: PERM_STATUS.Granted };
    expect(deriveMode(s)).toBe(PERM_MODE.Full);
    expect(nextAction(s)).toBe(PERM_ACTION.None);
  });

  it("foreground granted but background denied → reduced mode, route to settings", () => {
    const s = { foreground: PERM_STATUS.Granted, background: PERM_STATUS.Denied };
    expect(deriveMode(s)).toBe(PERM_MODE.Reduced);
    expect(nextAction(s)).toBe(PERM_ACTION.RouteSettings);
  });
});
