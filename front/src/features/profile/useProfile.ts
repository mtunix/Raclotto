import { useGetUserProfile, useGetUserStats } from "../../api/generated/endpoints/users/users";
import type { UserStatsDto } from "../../api/generated/model";
import { onErrorRetry } from "../../lib/api/swrHooks";

/** A user's profile and statistics; the statistics are empty when they failed to load. */
export function useProfile(userId: number) {
  const swr = {
    enabled: !!userId,
    onErrorRetry,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  };
  const { data: profile, isLoading: loadingProfile, error } = useGetUserProfile(userId, { swr });
  const { data: stats, isLoading: loadingStats } = useGetUserStats(userId, { swr });
  const shownStats: Partial<UserStatsDto> = stats ?? {};
  return { profile, stats: shownStats, loading: loadingProfile || loadingStats, error };
}
