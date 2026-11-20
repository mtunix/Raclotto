import { Button, Card, Col, Row, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { UserProfileDto } from "../../../api/generated/model";
import { useImageGeneration } from "../../../shared/imageGeneration";
import { ProfilePictureManager } from "../../../shared/ProfilePictureManager";
import { useMyPictureActions } from "../useMyPictureActions";
import { LevelSummary } from "./LevelSummary";
import "../profile.css";

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
  const canGenerate = useImageGeneration();

  return (
    <Card className="mb-24">
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} sm={12} md="auto" className="full-width">
          <Space orientation="vertical" align="center" size="middle" className="full-width">
            <div className="profile-picture-row">
              <div className="profile-picture">
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
                disabled={changing || !canGenerate}
                size="small"
                className="full-width"
              >
                {generating ? t("image.regenerating") : t("image.regeneratePicture")}
              </Button>
            )}
            {isOwnProfile && !canGenerate && (
              <Text type="secondary" className="profile-level-label">
                {t("image.generationUnavailable")}
              </Text>
            )}
          </Space>
        </Col>
        <Col xs={24} sm={12} md="auto" flex={1} className="text-center">
          <Title level={2} className="profile-name">
            {profile.name || t("profile.unknownUser")}
          </Title>
          {email && (
            <Text type="secondary" className="profile-email">
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
