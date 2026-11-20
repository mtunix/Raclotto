import { Button, Card, Col, Modal, Rate, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { displayName } from "../../../shared/displayName";
import { type Reel } from "./reelSpin";
import { BanditReels } from "./BanditReels";
import "./bandit.css";

const { Text, Title } = Typography;

interface BanditResultModalProps {
    open: boolean;
    spinning: boolean;
    /** The rolled pan once the reels stopped. */
    pan: PanDto | null;
    reels: Reel[];
    rating: number;
    onRate: (stars: number) => void;
    onSpinAgain: () => void;
    onClose: () => void;
}

/** The reels while they spin, then the pan they stopped on: its name, rating and another spin. */
export function BanditResultModal(props: BanditResultModalProps) {
    const { t } = useTranslation();
    const { open, spinning, pan, reels, rating, onRate, onSpinAgain, onClose } = props;

    return (
        <Modal
            open={open}
            onCancel={() => {
                if (!spinning) onClose();
            }}
            footer={null}
            width="90%"
            className="bandit-result-modal"
            centered
            closable={!spinning}
            mask={{ closable: !spinning }}
        >
            <div className="bandit-result">
                {pan ? (
                    <>
                        <Card className="bandit-result-banner" classNames={{ body: "bandit-result-banner-body" }}>
                            <Row align="middle" justify="space-between">
                                <Col flex="auto">
                                    <Title level={2} className="bandit-result-name">
                                        {displayName(pan.name, t)}
                                    </Title>
                                    {pan.preparation_type && (
                                        <Text className="bandit-result-prep">
                                            {t("generate.preparationType")}: {pan.preparation_type.name}
                                        </Text>
                                    )}
                                </Col>
                                <Col>
                                    <div className="bandit-result-rating">
                                        <Text strong className="bandit-result-rate-label">
                                            {t("common.rate")}
                                        </Text>
                                        <Rate value={rating} onChange={onRate} className="bandit-result-rate" />
                                    </div>
                                </Col>
                            </Row>
                        </Card>

                        <BanditReels reels={reels} />

                        <Row className="mt-24">
                            <Col span={24}>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    onClick={onSpinAgain}
                                    className="bandit-result-again"
                                >
                                    {t("generate.rollAnotherDice")}
                                </Button>
                            </Col>
                        </Row>
                    </>
                ) : (
                    <>
                        <Row gutter={16} className="mb-16">
                            <Col span={24} className="text-center">
                                <Title level={3} className="mb-8">
                                    {spinning
                                        ? t("generate.banditSpinning")
                                        : t("generate.banditResult")}
                                </Title>
                            </Col>
                        </Row>
                        <BanditReels reels={reels} />
                    </>
                )}
            </div>
        </Modal>
    );
}
