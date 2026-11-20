import type { MeDto, PanDto, SessionDto } from "../api/generated/model";

/**
 * Rename, close, reactivate, delete and configure events: the session's creator or an admin, as
 * the backend decides (interactor/permissions.py); views only hide what it would refuse.
 */
export function canManageSession(user: MeDto | null, session: SessionDto | null): boolean {
  if (!user || !session) return false;
  return user.is_admin || session.created_by_user_id === user.id;
}

/** Delete a pan, with its ratings: its author alone, not even an admin. */
export function canDeletePan(user: MeDto | null, pan: Pick<PanDto, "user_id">): boolean {
  return user !== null && pan.user_id === user.id;
}

/** See who is an admin: admins only. */
/** Guests invite no one until they keep their account. */
export function canInvite(user: MeDto | null): boolean {
  return user !== null && !user.is_guest;
}

export function canManageAdmins(user: MeDto | null): boolean {
  return user?.is_admin ?? false;
}

/** Grant or revoke admin: an admin, for anyone but themselves, so the last admin can't be lost. */
export function canChangeAdmin(user: MeDto | null, other: { id: number }): boolean {
  return canManageAdmins(user) && user?.id !== other.id;
}
