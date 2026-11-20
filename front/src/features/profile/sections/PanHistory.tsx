import type { ReactNode } from "react";
import { Button, Card, Col, Empty, Row, Spin } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { ProfilePanCard } from "./ProfilePanCard";
import "../profile.css";

interface PanHistoryProps {
  pans: PanDto[];
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
}

/** The pans the user rolled, newest first, a page at a time. */
export function PanHistory({ pans, hasMore, loadMore, loading }: PanHistoryProps) {
  const { t } = useTranslation();

  let content: ReactNode;
  if (loading && pans.length === 0) {
    content = (
      <div className="loading-block">
        <Spin size="large" />
      </div>
    );
  } else if (pans.length === 0) {
    content = (
      <Empty description={t("history.noPans")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  } else {
    content = (
      <>
        <Row gutter={[16, 16]}>
          {pans.map((pan) => (
            <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
              <ProfilePanCard pan={pan} />
            </Col>
          ))}
        </Row>
        {hasMore && (
          <div className="profile-more">
            <Button type="primary" loading={loading} onClick={loadMore} size="large">
              {t("history.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  }

  return <Card title={t("profile.pansHistory")}>{content}</Card>;
}
