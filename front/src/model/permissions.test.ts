import { me, session } from "../lib/api/__fixtures__/backendResponses";
import { canManageSession } from "./permissions";

const other = { ...me, id: me.id + 100 };

describe("canManageSession", () => {
  it("lets the creator and admins manage a session", () => {
    const own = { ...session, created_by_user_id: me.id };

    expect(canManageSession(me, own)).toBe(true);
    expect(canManageSession(other, own)).toBe(false);
    expect(canManageSession({ ...other, is_admin: true }, own)).toBe(true);
  });

  it("leaves a session without a creator to admins", () => {
    const orphan = { ...session, created_by_user_id: null };

    expect(canManageSession(me, orphan)).toBe(false);
    expect(canManageSession({ ...me, is_admin: true }, orphan)).toBe(true);
  });

  it("answers no while the user or the session is unknown", () => {
    expect(canManageSession(null, session)).toBe(false);
    expect(canManageSession(me, null)).toBe(false);
  });
});
