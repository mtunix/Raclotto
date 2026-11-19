import type { MeDto, SessionDto } from "../api/generated/model";

/**
 * Rename, close, reactivate, delete and configure events: the session's creator or an admin, as
 * the backend decides (interactor/permissions.py); views only hide what it would refuse.
 */
export function canManageSession(user: MeDto | null, session: SessionDto | null): boolean {
  if (!user || !session) return false;
  return user.is_admin || session.created_by_user_id === user.id;
}
