import React, { useState } from "react";
import {
  Button,
  Card,
  Space,
  Row,
  Col,
  message,
  Typography,
  Spin,
  Empty,
  Tag,
  Progress,
  Statistic,
  Rate,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useParams } from "react-router";
import { useAuthStore } from "../../AuthSlice";
import { useTranslation } from "react-i18next";
import { onErrorRetry } from "../../lib/api/swrHooks";
import {
  useGetUserProfile,
  useGetUserStats,
} from "../../api/generated/endpoints/users/users";
import type {
  AchievementDto,
  PanDto,
  UserStatsDto,
} from "../../api/generated/model";
import { usePanPages } from "../history/usePanPages";
import { IngredientDisplay } from "../../shared/IngredientDisplay/IngredientDisplay";
import { displayName } from "../../shared/displayName";
import { achievementValueColor } from "../../shared/achievementValueColor";
import { levelProgress } from "../../model/levelProgress";
import { ProfilePictureManager } from "../../shared/ProfilePictureManager";
import { changeMyPicture, generateMyPicture } from "../../shared/myProfilePicture";
import { VectorGraphics } from "../../lib/vectorGraphics";
import { getTextureBorderImage } from "../../lib/borderTextures";

const { Title, Text } = Typography;

export function ProfileView() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId?: string }>();
  const currentUser = useAuthStore((state) => state.user);

  // Use current user ID if no userId provided
  const targetUserId = userId || currentUser?.id?.toString() || "0";
  const targetUserIdNumber = parseInt(targetUserId, 10);
  const isOwnProfile = !userId || targetUserId === currentUser?.id?.toString();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isRegeneratingPicture, setIsRegeneratingPicture] = useState(false);

  const swr = {
    enabled: !!targetUserIdNumber,
    onErrorRetry,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  };
  const {
    data: userProfile,
    isLoading: loadingProfile,
    error: profileError,
  } = useGetUserProfile(targetUserIdNumber, { swr });
  const { data: userStats, isLoading: loadingStats } = useGetUserStats(
    targetUserIdNumber,
    { swr },
  );

  // Get user's pans (all sessions)
  const {
    pans,
    hasMore,
    loadMore,
    isLoading: loadingPans,
  } = usePanPages({ user_id: targetUserIdNumber });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleProfilePictureChange = async (newPicture: string | null) => {
    if (!isOwnProfile || !currentUser) return;

    setIsUpdatingProfile(true);
    try {
      await changeMyPicture(newPicture);
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
      const { image_base64 } = await generateMyPicture(profileData.level?.id);
      if (!image_base64) {
        throw new Error("No image data returned from server");
      }
      message.success(
        t("profile.pictureUpdated") || "Profile picture updated successfully",
      );
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

  const profileData = userProfile;
  const stats: Partial<UserStatsDto> = userStats ?? {};
  const achievements = profileData.achievements;
  // Only the signed-in user's own email is sent to them.
  const email = isOwnProfile ? currentUser?.email : null;

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Profile Header */}
      <Card style={{ marginBottom: "24px" }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={12} md="auto" style={{ width: "100%" }}>
            <Space
              direction="vertical"
              align="center"
              size="middle"
              style={{
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    maxWidth: "180px",
                    width: "100%",
                    aspectRatio: "1",
                  }}
                >
                  <ProfilePictureManager
                    currentPicture={profileData.profile_picture}
                    onPictureChange={handleProfilePictureChange}
                    disabled={isUpdatingProfile || isRegeneratingPicture}
                    size={180}
                    showLabel={isOwnProfile}
                    userName={profileData.name}
                    isOwnProfile={isOwnProfile}
                    userId={targetUserIdNumber}
                  />
                </div>
              </div>
              {isOwnProfile && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerateProfilePicture}
                  loading={isRegeneratingPicture}
                  disabled={isUpdatingProfile}
                  size="small"
                  style={{
                    width: "100%",
                  }}
                >
                  {isRegeneratingPicture
                    ? "Generating..."
                    : "Regenerate Picture"}
                </Button>
              )}
            </Space>
          </Col>
          <Col
            xs={24}
            sm={12}
            md="auto"
            flex={1}
            style={{ textAlign: "center" }}
          >
            <Title level={2} style={{ margin: 0, marginBottom: "8px" }}>
              {profileData.name || t("profile.unknownUser")}
            </Title>
            {email && (
              <Text
                type="secondary"
                style={{
                  fontSize: "16px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                {email}
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
                    const { xpInLevel, xpNeeded, percent } = levelProgress(
                      profileData.experience_points,
                      profileData.level,
                      profileData.next_level,
                    );

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
                            {xpInLevel} / {xpNeeded} XP
                          </Text>
                        </div>
                        <Progress
                          percent={percent}
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
                    ingredient={stats.best_rated_ingredient.ingredient}
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
                value={displayName(stats.most_ingredients_pan.name, t)}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title={t("profile.ingredientCount") || "Ingredient Count"}
                value={stats.most_ingredients_pan.ingredients.length}
              />
            </Col>
          </Row>
          {stats.most_ingredients_pan.ingredients.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <Text strong style={{ display: "block", marginBottom: "12px" }}>
                  {t("profile.ingredients") || "Ingredients"}
                </Text>
                <Space
                  wrap
                  style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                >
                  {stats.most_ingredients_pan.ingredients.map(
                    (ingredient) => (
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
            {achievements.map((achievement: AchievementDto) => (
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
                    <Tag color={achievementValueColor(achievement.value || 0)}>
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
        {loadingPans && pans.length === 0 ? (
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
              {pans.map((pan: PanDto) => {
                const borderColor = pan.author?.color ?? "#d9d9d9";
                const borderWidth = "5px";
                const borderStyle = pan.author?.border_style ?? "solid";
                const borderTexture = pan.author?.border_texture ?? null;
                const textureBorderImage = getTextureBorderImage(borderTexture);
                const glowEffect = pan.author?.glow_effect ?? false;

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
                          {displayName(pan.name, t)}
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
                  loading={loadingPans}
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
