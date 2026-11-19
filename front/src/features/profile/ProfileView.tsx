import React from "react";
import { Card, Empty, Spin } from "antd";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../AuthSlice";
import { usePanPages } from "../history/usePanPages";
import { profileTarget } from "./profileTarget";
import { useProfile } from "./useProfile";
import { AchievementList } from "./sections/AchievementList";
import { PanHistory } from "./sections/PanHistory";
import { ProfileHeader } from "./sections/ProfileHeader";
import { ProfileHighlights } from "./sections/ProfileHighlights";
import { ProfileStatistics } from "./sections/ProfileStatistics";

export function ProfileView() {
  const { t } = useTranslation();
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const { userId, isOwnProfile } = profileTarget(userIdParam, currentUser?.id);
  const { profile, stats, loading, error } = useProfile(userId);
  // Asked for alongside the profile rather than once it has loaded.
  const { pans, hasMore, loadMore, isLoading: loadingPans } = usePanPages({ user_id: userId });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card>
        <Empty description={t("profile.userNotFound") || "User not found"} />
      </Card>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <ProfileHeader
        profile={profile}
        userId={userId}
        isOwnProfile={isOwnProfile}
        email={isOwnProfile ? currentUser?.email : null}
      />
      <ProfileStatistics stats={stats} />
      <ProfileHighlights stats={stats} />
      <AchievementList achievements={profile.achievements} />
      <PanHistory pans={pans} hasMore={hasMore} loadMore={loadMore} loading={loadingPans} />
    </div>
  );
}
