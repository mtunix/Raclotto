import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import type { RollOutcomeDto } from "../../api/generated/model";
import {
  mutateAchievements,
  mutateAvailableCounts,
  mutateEvents,
  mutateMe,
  mutatePanLists,
  mutateUserProfile,
} from "../../lib/api/swrHooks";

export interface LevelUp {
  leveledUp: boolean;
  /** The level reached, when `leveledUp`. */
  newLevelId?: number;
}

/**
 * Apply everything a pan roll caused to the client state, in one place:
 * the signed-in user's XP/level, the XP notification, and the SWR caches the
 * roll invalidates. Returns the level-up (if any) so the caller can offer the
 * level-up profile picture.
 */
export function applyRollOutcome(outcome: RollOutcomeDto, sessionKey: string): LevelUp {
  const { reward, achievements, events } = outcome;
  const { user, setUser } = useAuthStore.getState();

  if (user) {
    setUser({
      ...user,
      experience_points: reward.xp_after,
      level: reward.level ?? user.level,
      next_level: reward.next_level,
    });
  }

  if (reward.xp_gained > 0 && reward.level) {
    useAppStore
      .getState()
      .showXpNotification(
        reward.xp_gained,
        reward.xp_before,
        reward.xp_after,
        reward.level,
        reward.next_level,
        reward.leveled_up,
        achievements,
      );
  }

  mutatePanLists();
  mutateAvailableCounts(sessionKey);
  if (user) {
    mutateUserProfile(user.id);
    mutateMe();
  }
  if (achievements.length > 0) mutateAchievements();
  if (events.length > 0) mutateEvents(sessionKey);

  return reward.leveled_up && reward.level
    ? { leveledUp: true, newLevelId: reward.level.id }
    : { leveledUp: false };
}
