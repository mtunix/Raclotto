import { Button, Card, Col, Row, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { UserProfileDto } from "../../../api/generated/model";
import { ProfilePictureManager } from "../../../shared/ProfilePictureManager";
import { useMyPictureActions } from "../useMyPictureActions";
import { LevelSummary } from "./LevelSummary";

const { Title, Text } = Typography;

interface ProfileHeaderProps {
  profile: UserProfileDto;
  userId: number;
  isOwnProfile: boolean;
  /** Only the signed-in user's own email is known. */
  email?: string | null;
}

/** The user's picture, name, email and level; on their own profile also changing the picture. */
export function ProfileHeader({ profile, userId, isOwnProfile, email }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { changing, generating, change, regenerate } = useMyPictureActions(isOwnProfile, profile.level?.id);

  return (
    <Card style={{ marginBottom: "24px" }}>
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} sm={12} md="auto" style={{ width: "100%" }}>
          <Space orientation="vertical" align="center" size="middle" style={{ width: "100%" }}>
            <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ maxWidth: "180px", width: "100%", aspectRatio: "1" }}>
                <ProfilePictureManager
                  currentPicture={profile.profile_picture}
                  onPictureChange={change}
                  disabled={changing || generating}
                  size={180}
                  showLabel={isOwnProfile}
                  userName={profile.name}
                  isOwnProfile={isOwnProfile}
                  userId={userId}
                />
              </div>
            </div>
            {isOwnProfile && (
              <Button
                icon={<ReloadOutlined />}
                onClick={regenerate}
                loading={generating}
                disabled={changing}
                size="small"
                style={{ width: "100%" }}
              >
                {generating ? "Generating..." : "Regenerate Picture"}
              </Button>
            )}
          </Space>
        </Col>
        <Col xs={24} sm={12} md="auto" flex={1} style={{ textAlign: "center" }}>
          <Title level={2} style={{ margin: 0, marginBottom: "8px" }}>
            {profile.name || t("profile.unknownUser")}
          </Title>
          {email && (
            <Text type="secondary" style={{ fontSize: "16px", display: "block", marginBottom: "8px" }}>
              {email}
            </Text>
          )}
          {profile.level && (
            <LevelSummary
              level={profile.level}
              nextLevel={profile.next_level}
              experiencePoints={profile.experience_points}
            />
          )}
        </Col>
      </Row>
    </Card>
  );
}
