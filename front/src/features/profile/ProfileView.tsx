import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Alert,
  Space,
  Upload,
  Avatar,
  Row,
  Col,
  Radio,
  Slider,
  Checkbox,
  message,
  Typography,
  Spin,
  Empty,
  Tag,
  Progress,
  Statistic,
  Rate,
  Modal,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../AuthSlice";
import { useTranslation } from "react-i18next";
import {
  useUserProfile,
  useUserStats,
  usePansByUser,
  mutateUser,
} from "../../lib/api/swrHooks";
import { postRaw } from "../../lib/api/api";
import { Achievement } from "../../model/achievement";
import { Pan } from "../../model/pan";
import { IngredientDisplay } from "../../shared/IngredientDisplay/IngredientDisplay";
import { ProfilePictureManager } from "../../shared/ProfilePictureManager";
import { VectorGraphics } from "../../lib/vectorGraphics";
import { getTextureBorderImage } from "../../lib/borderTextures";
import { Api } from "../../lib/api";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";

const { Title, Text } = Typography;

export function ProfileView() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Use current user ID if no userId provided
  const targetUserId = userId || currentUser?.id?.toString() || "0";
  const targetUserIdNumber = parseInt(targetUserId, 10);
  const isOwnProfile = !userId || targetUserId === currentUser?.id?.toString();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isRegeneratingPicture, setIsRegeneratingPicture] = useState(false);

  const {
    data: userProfile,
    isLoading: loadingProfile,
    error: profileError,
    mutate: mutateUserProfile,
  } = useUserProfile(targetUserIdNumber);
  const { data: userStats, isLoading: loadingStats } =
    useUserStats(targetUserIdNumber);

  // Get user's pans (all sessions)
  const [offset, setOffset] = useState(0);
  const limit = 12;
  const { data: currentPageData, isLoading: loadingPans } = usePansByUser(
    targetUserIdNumber,
    limit,
    offset,
  );
  const [allPans, setAllPans] = useState<Pan[]>([]);

  // Reset when user changes
  useEffect(() => {
    if (targetUserIdNumber) {
      setOffset(0);
      setAllPans([]);
    }
  }, [targetUserIdNumber]);

  // Update accumulated pans when new page data arrives
  useEffect(() => {
    if (currentPageData) {
      if (offset === 0) {
        setAllPans(currentPageData.data);
      } else {
        setAllPans((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPans = currentPageData.data.filter(
            (p) => !existingIds.has(p.id),
          );
          return [...prev, ...newPans];
        });
      }
    }
  }, [currentPageData, offset]);

  const loadMore = useCallback(() => {
    if (currentPageData?.hasMore) {
      setOffset((prev) => prev + limit);
    }
  }, [currentPageData, limit]);

  const hasMore = currentPageData?.hasMore || false;
  const pans =
    offset === 0 && allPans.length === 0 && currentPageData?.data
      ? currentPageData.data
      : allPans;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getValueColor = (value: number): string => {
    if (value >= 30) return "red";
    if (value >= 15) return "orange";
    if (value >= 10) return "gold";
    if (value >= 5) return "blue";
    return "default";
  };

  const handleProfilePictureChange = async (newPicture: string | null) => {
    if (!isOwnProfile || !currentUser) return;

    setIsUpdatingProfile(true);
    try {
      // Send null explicitly to remove profile picture, undefined to keep current
      const response = await Api.updateCurrentUser({
        profile_picture: newPicture,
      });

      // Update local user state with the response from the API
      const updatedUser = { ...currentUser, ...response };
      setUser(updatedUser);

      // Refetch user data from auth store to ensure consistency
      const fetchUser = useAuthStore.getState().fetchUser;
      await fetchUser();

      // Invalidate SWR cache for current user
      await mutateUser();

      // Re-fetch profile data to update the display immediately
      await mutateUserProfile();

      message.success(
        t("profile.pictureUpdated") || "Profile picture updated successfully",
      );
    } catch (error: any) {
      console.error("Failed to update profile picture:", error);
      message.error(
        error.message ||
          t("profile.pictureUpdateFailed") ||
          "Failed to update profile picture",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRegenerateProfilePicture = async () => {
    if (!isOwnProfile || !currentUser || !profileData) return;

    setIsRegeneratingPicture(true);
    try {
      // Create a creative prompt for the profile picture generation
      const prompt = `adjust the picture to show the original person which has now achieved the rank ${t(profileData.level.name)} which corresponds to rank ${profileData.level.id} of 20 of the progression in raclotto. Raclotto is a combination of raclette and lotto. Make sure to include the ${t(profileData.level.name)} in the picture as best as possible`;
      // Call the backend image generation API
      // The backend automatically saves the generated image to the user's profile picture history
      const data = await postRaw("/api/images/generate-banana", {
        prompt,
      });

      const imageBase64 = data?.data?.attributes?.imageBase64;
      const profilePictureUpdated =
        data?.data?.attributes?.profilePictureUpdated;

      if (!imageBase64) {
        throw new Error("No image data returned from server");
      }

      // If the backend successfully saved the profile picture, refetch the data
      if (profilePictureUpdated) {
        // Refetch profile data to update the display with the new image
        await mutateUserProfile();

        message.success(
          t("profile.pictureUpdated") || "Profile picture updated successfully",
        );
      } else {
        throw new Error("Profile picture was not saved by server");
      }
    } catch (error: any) {
      console.error("Failed to regenerate profile picture:", error);
      message.error(
        error.message ||
          t("profile.regenerateFailed") ||
          "Failed to regenerate profile picture",
      );
    } finally {
      setIsRegeneratingPicture(false);
    }
  };

  if (loadingProfile || loadingStats) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (profileError || !userProfile) {
    return (
      <Card>
        <Empty description={t("profile.userNotFound") || "User not found"} />
      </Card>
    );
  }

  const profileData = userProfile.attributes || userProfile;
  const stats = userStats || {};
  // Achievements might be in attributes or directly in profileData
  const achievements =
    profileData.achievements ||
    (userProfile.achievements ? userProfile.achievements : []);

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: "24px" }}>
        <Row gutter={[24, 24]} align="middle">
          <Col>
            <Space direction="vertical" align="center" size="middle">
              <ProfilePictureManager
                currentPicture={profileData.profile_picture}
                onPictureChange={handleProfilePictureChange}
                disabled={isUpdatingProfile || isRegeneratingPicture}
                size={120}
                showLabel={isOwnProfile}
                userName={profileData.name}
                isOwnProfile={isOwnProfile}
                userId={targetUserIdNumber}
              />
              {isOwnProfile && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerateProfilePicture}
                  loading={isRegeneratingPicture}
                  disabled={isUpdatingProfile}
                  size="small"
                >
                  {isRegeneratingPicture
                    ? "Generating..."
                    : "Regenerate Picture"}
                </Button>
              )}
            </Space>
          </Col>
          <Col flex={1}>
            <Title level={2} style={{ margin: 0, marginBottom: "8px" }}>
              {profileData.name || t("profile.unknownUser")}
            </Title>
            {profileData.email && (
              <Text
                type="secondary"
                style={{
                  fontSize: "16px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                {profileData.email}
              </Text>
            )}
            {profileData.level && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ marginBottom: "8px" }}>
                  <Tag
                    color="blue"
                    style={{ fontSize: "14px", padding: "4px 12px" }}
                  >
                    <strong>
                      {t("profile.level") || "Level"} {profileData.level.id}:{" "}
                      {String(
                        t(profileData.level.name, {
                          defaultValue: profileData.level.name,
                        }),
                      )}
                    </strong>
                  </Tag>
                  {profileData.experience_points !== undefined && (
                    <Text
                      type="secondary"
                      style={{ marginLeft: "8px", fontSize: "14px" }}
                    >
                      {profileData.experience_points} XP
                    </Text>
                  )}
                </div>
                {profileData.next_level &&
                  profileData.experience_points !== undefined &&
                  (() => {
                    const currentXP = profileData.experience_points;
                    const currentLevelXP =
                      profileData.level.required_experience;
                    const nextLevelXP =
                      profileData.next_level.required_experience;
                    const xpInCurrentLevel = Math.max(
                      0,
                      currentXP - currentLevelXP,
                    );
                    const xpNeededForNext = nextLevelXP - currentLevelXP;
                    const progressPercent =
                      xpNeededForNext > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (xpInCurrentLevel / xpNeededForNext) * 100,
                            ),
                          )
                        : 100;

                    return (
                      <div style={{ marginTop: "8px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {t("level.progressTo")}{" "}
                            {String(
                              t(profileData.next_level.name, {
                                defaultValue: profileData.next_level.name,
                              }),
                            )}
                          </Text>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {xpInCurrentLevel} / {xpNeededForNext} XP
                          </Text>
                        </div>
                        <Progress
                          percent={progressPercent}
                          strokeColor={{
                            "0%": "#108ee9",
                            "100%": "#87d068",
                          }}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    );
                  })()}
                {!profileData.next_level &&
                  profileData.experience_points !== undefined && (
                    <div style={{ marginTop: "8px" }}>
                      <Text
                        type="secondary"
                        style={{ fontSize: "12px", fontStyle: "italic" }}
                      >
                        {t("level.maximumLevelReached")}
                      </Text>
                    </div>
                  )}
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* Statistics Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title={t("profile.totalPans") || "Total Pans"}
              value={stats.total_pans || 0}
              prefix={VectorGraphics.HISTORY}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title={t("profile.totalRatings") || "Ratings Given"}
              value={stats.total_ratings_given || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title={t("profile.averageRating") || "Avg Rating"}
              value={stats.average_rating_received || 0}
              precision={2}
              suffix="/ 5"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title={t("profile.achievementPoints") || "Achievement Points"}
              value={stats.total_achievement_points || 0}
              prefix={VectorGraphics.ACHIEVEMENTS}
            />
          </Card>
        </Col>
        {stats.average_ingredients_per_pan !== undefined && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title={t("profile.avgIngredientsPerPan") || "Avg Ingredients"}
                value={stats.average_ingredients_per_pan || 0}
                precision={1}
              />
            </Card>
          </Col>
        )}
        {stats.sessions_participated !== undefined && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title={t("profile.sessionsParticipated") || "Sessions"}
                value={stats.sessions_participated || 0}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Best Session Stats */}
      {stats.most_pans_session && (
        <Card
          title={t("profile.bestSession") || "Best Session"}
          style={{ marginBottom: "24px" }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title={t("profile.sessionName") || "Session"}
                value={stats.most_pans_session.session_name || "N/A"}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title={t("profile.pansInSession") || "Pans Created"}
                value={stats.most_pans_session.pan_count || 0}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Favorite and Best Rated Ingredients */}
      {(stats.favorite_ingredient || stats.best_rated_ingredient) && (
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          {stats.favorite_ingredient && (
            <Col xs={24} md={12}>
              <Card title={t("profile.mostUsedIngredient")}>
                <IngredientDisplay
                  ingredient={stats.favorite_ingredient}
                  variant="badge"
                  showTags={false}
                  showIcon={true}
                />
              </Card>
            </Col>
          )}
          {stats.best_rated_ingredient && (
            <Col xs={24} md={12}>
              <Card
                title={
                  t("profile.bestRatedIngredient") || "Best Rated Ingredient"
                }
              >
                <div>
                  <IngredientDisplay
                    ingredient={stats.best_rated_ingredient}
                    variant="badge"
                    showTags={false}
                    showIcon={true}
                  />
                  {stats.best_rated_ingredient.avg_rating && (
                    <div style={{ marginTop: "8px" }}>
                      <Rate
                        disabled
                        allowHalf
                        value={stats.best_rated_ingredient.avg_rating}
                        style={{ fontSize: "14px" }}
                      />
                      <Text type="secondary" style={{ marginLeft: "8px" }}>
                        {stats.best_rated_ingredient.avg_rating.toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* Pan with Most Ingredients */}
      {stats.most_ingredients_pan && (
        <Card
          title={t("profile.biggestPan") || "Biggest Pan"}
          style={{ marginBottom: "24px" }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Statistic
                title={t("profile.panName") || "Pan Name"}
                value={stats.most_ingredients_pan.name}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title={t("profile.ingredientCount") || "Ingredient Count"}
                value={stats.most_ingredients_pan.ingredient_count}
              />
            </Col>
          </Row>
          {stats.most_ingredients_pan.ingredients &&
            stats.most_ingredients_pan.ingredients.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <Text strong style={{ display: "block", marginBottom: "12px" }}>
                  {t("profile.ingredients") || "Ingredients"}
                </Text>
                <Space
                  wrap
                  style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                >
                  {stats.most_ingredients_pan.ingredients.map(
                    (ingredient: any) => (
                      <div key={ingredient.id} style={{ marginBottom: "8px" }}>
                        <IngredientDisplay
                          ingredient={ingredient}
                          variant="badge"
                          showTags={true}
                          showIcon={true}
                        />
                      </div>
                    ),
                  )}
                </Space>
              </div>
            )}
        </Card>
      )}

      {/* Achievements */}
      <Card
        title={t("profile.achievements") || "Achievements"}
        style={{ marginBottom: "24px" }}
      >
        {achievements.length > 0 ? (
          <Row gutter={[16, 16]}>
            {achievements.map((achievement: Achievement) => (
              <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                <Card
                  size="small"
                  style={{
                    border: "2px solid #52c41a",
                    backgroundColor: "#f6ffed",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <Title level={5} style={{ margin: 0, fontSize: "14px" }}>
                        {achievement.title || ""}
                      </Title>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {achievement.description || ""}
                      </Text>
                    </div>
                    <Tag color={getValueColor(achievement.value || 0)}>
                      {achievement.value || 0}{" "}
                      {t("achievement.points") || "pts"}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description={
              t("profile.noAchievements") || "No achievements unlocked yet"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* Pans History */}
      <Card title={t("profile.pansHistory") || "Pans History"}>
        {loadingPans && offset === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <Spin size="large" />
          </div>
        ) : pans.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {pans.map((pan: Pan) => {
                const borderColor = pan.user_color || "#d9d9d9";
                const borderWidth = "5px";
                const borderStyle = pan.user_border_style || "solid";
                const borderTexture = pan.user_border_texture;
                const textureBorderImage = getTextureBorderImage(borderTexture);
                const glowEffect = pan.user_glow_effect || false;

                const cssBorderStyle =
                  borderStyle as React.CSSProperties["borderStyle"];
                const borderStyleObj: React.CSSProperties = {
                  height: "100%",
                  marginBottom: "16px",
                };

                let wrapperStyle: React.CSSProperties | undefined = undefined;

                if (textureBorderImage) {
                  const imageUrl =
                    textureBorderImage.match(/url\(([^)]+)\)/)?.[1];
                  wrapperStyle = {
                    borderRadius: "18px",
                    padding: borderWidth,
                    background: imageUrl ? `url(${imageUrl})` : borderColor,
                    backgroundSize: "auto",
                    backgroundRepeat: "repeat",
                    marginBottom: "16px",
                    position: "relative" as const,
                    overflow: "hidden" as const,
                  };
                  borderStyleObj.border = "none";
                  borderStyleObj.borderRadius = "18px";
                  borderStyleObj.height = "100%";
                  borderStyleObj.marginBottom = "0";
                  borderStyleObj.backgroundColor = "#ffffff";
                  borderStyleObj.position = "relative" as const;
                } else {
                  borderStyleObj.borderTop = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                  borderStyleObj.borderRight = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                  borderStyleObj.borderBottom = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                  borderStyleObj.borderLeft = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                  borderStyleObj.borderRadius = "18px";
                }

                // Apply glow effect if enabled
                let glowClassName = "";
                let glowWrapperClassName = "";
                if (glowEffect) {
                  const glowColor = borderColor || "#d9d9d9";
                  // Convert hex color to RGB for rgba
                  const hexToRgb = (hex: string) => {
                    const result =
                      /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result
                      ? {
                          r: parseInt(result[1], 16),
                          g: parseInt(result[2], 16),
                          b: parseInt(result[3], 16),
                        }
                      : { r: 217, g: 217, b: 217 }; // Default gray
                  };
                  const rgb = hexToRgb(glowColor);
                  // Very visible glow - using rgba for better control
                  const glowColorRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
                  const glowColorRgbaLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
                  const glowColorRgbaVeryLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;

                  // Strong, very visible glow shadow with multiple layers
                  const glowShadow = `0 0 25px 6px ${glowColorRgba}, 0 0 40px 10px ${glowColorRgbaLight}, 0 0 60px 15px ${glowColorRgbaVeryLight}`;
                  borderStyleObj.boxShadow = glowShadow;
                  if (wrapperStyle) {
                    wrapperStyle.boxShadow = glowShadow;
                  }

                  glowClassName = "pan-card-glow-card";
                  glowWrapperClassName = "pan-card-glow-wrapper";
                }

                const cardContent = (
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Space direction="vertical" size={0} style={{ flex: 1 }}>
                        <Title
                          level={4}
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            marginBottom: "4px",
                          }}
                        >
                          {pan.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: "0.7rem" }}>
                          {formatDate(pan.timestamp)}
                        </Text>
                      </Space>
                      {pan.rating > 0 && (
                        <div style={{ textAlign: "right", marginLeft: "8px" }}>
                          <Tag color="gold" style={{ fontSize: "0.7rem" }}>
                            {pan.rating.toFixed(1)}
                          </Tag>
                        </div>
                      )}
                    </div>
                    <div>
                      {pan.ingredients.length > 0 ? (
                        <Space wrap size="small">
                          {pan.ingredients.map((ingredient) => (
                            <IngredientDisplay
                              key={ingredient.id}
                              ingredient={ingredient}
                              variant="badge"
                              showTags={false}
                              showIcon={true}
                            />
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                          {t("ingredient.noIngredients") || "No ingredients"}
                        </Text>
                      )}
                    </div>
                  </Space>
                );

                return (
                  <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
                    {textureBorderImage ? (
                      <div
                        style={wrapperStyle}
                        className={glowWrapperClassName}
                      >
                        <Card
                          style={borderStyleObj}
                          className={glowClassName}
                          bodyStyle={{ padding: "12px" }}
                        >
                          {cardContent}
                        </Card>
                      </div>
                    ) : (
                      <Card
                        style={borderStyleObj}
                        className={glowClassName}
                        bodyStyle={{ padding: "12px" }}
                      >
                        {cardContent}
                      </Card>
                    )}
                  </Col>
                );
              })}
            </Row>
            {hasMore && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                  marginBottom: "24px",
                }}
              >
                <Button
                  type="primary"
                  loading={loadingPans && offset > 0}
                  onClick={loadMore}
                  size="large"
                >
                  {t("history.loadMore") || "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Empty
            description={t("history.noPans") || "No pans in history"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  );
}
