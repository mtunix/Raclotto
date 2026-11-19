import { Button, Card, Col, Modal, Rate, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { displayName } from "../../../shared/displayName";
import { type Reel } from "./reelSpin";
import { BanditReels } from "./BanditReels";

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
            style={{ maxWidth: "1200px" }}
            centered
            closable={!spinning}
            mask={{ closable: !spinning }}
        >
            <div style={{ padding: "20px 0" }}>
                {pan ? (
                    <>
                        <Card
                            style={{
                                marginBottom: "24px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                border: "none",
                            }}
                            styles={{ body: { padding: "20px" } }}
                        >
                            <Row align="middle" justify="space-between">
                                <Col flex="auto">
                                    <Title level={2} style={{ color: "white", margin: 0, fontWeight: 700 }}>
                                        {displayName(pan.name, t)}
                                    </Title>
                                    {pan.preparation_type && (
                                        <Text style={{ color: "white", opacity: 0.9, fontSize: "0.9rem", display: "block", marginTop: "4px" }}>
                                            {t("generate.preparationType") || "Preparation Type"}: {pan.preparation_type.name}
                                        </Text>
                                    )}
                                </Col>
                                <Col>
                                    <div style={{
                                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        backdropFilter: "blur(10px)",
                                    }}>
                                        <Text strong style={{ color: "white", display: "block", marginBottom: "4px" }}>
                                            {t("common.rate") || "Rate this pan"}
                                        </Text>
                                        <Rate value={rating} onChange={onRate} style={{ fontSize: "1.2rem" }} />
                                    </div>
                                </Col>
                            </Row>
                        </Card>

                        <BanditReels reels={reels} />

                        <Row style={{ marginTop: "24px" }}>
                            <Col span={24}>
                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    onClick={onSpinAgain}
                                    style={{ height: "48px", fontSize: "1rem", fontWeight: 600 }}
                                >
                                    {t("generate.rollAnotherDice") || "Roll Another Dice"}
                                </Button>
                            </Col>
                        </Row>
                    </>
                ) : (
                    <>
                        <Row gutter={16} style={{ marginBottom: "16px" }}>
                            <Col span={24} style={{ textAlign: "center" }}>
                                <Title level={3} style={{ marginBottom: "8px" }}>
                                    {spinning
                                        ? (t("generate.banditSpinning") || "Spinning...")
                                        : (t("generate.banditResult") || "Your Result!")}
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
