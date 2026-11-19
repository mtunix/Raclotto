import type { MeDto, SessionDto } from "../api/generated/model";

/**
 * Rename, close, reactivate, delete and configure events: the session's creator or an admin, as
 * the backend decides (interactor/permissions.py); views only hide what it would refuse.
 */
export function canManageSession(user: MeDto | null, session: SessionDto | null): boolean {
  if (!user || !session) return false;
  return user.is_admin || session.created_by_user_id === user.id;
}

/** See who is an admin: admins only. */
export function canManageAdmins(user: MeDto | null): boolean {
  return user?.is_admin ?? false;
}

/** Grant or revoke admin: an admin, for anyone but themselves, so the last admin can't be lost. */
export function canChangeAdmin(user: MeDto | null, other: { id: number }): boolean {
  return canManageAdmins(user) && user?.id !== other.id;
}
