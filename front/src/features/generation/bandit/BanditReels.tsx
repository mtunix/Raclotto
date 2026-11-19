import React from "react";
import { Card, Col, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { columnSpan, Reel, ReelStatus } from "./reelSpin";
import "./bandit.css";

const { Text } = Typography;

interface Look {
    cardBorder: string;
    cardShadow: string;
    cardBackground: string;
    windowBorder: string;
    windowShadow: string;
    emojiClass: string;
    emojiScale: string;
}

const LOOKS: Record<ReelStatus, Look> = {
    idle: {
        cardBorder: "1px solid #d9d9d9",
        cardShadow: "none",
        cardBackground: "#fff",
        windowBorder: "1px solid #e8e8e8",
        windowShadow: "none",
        emojiClass: "bandit-stopped-emoji",
        emojiScale: "scale(1)",
    },
    spinning: {
        cardBorder: "2px solid #1890ff",
        cardShadow: "0 0 10px rgba(24, 144, 255, 0.5)",
        cardBackground: "#f0f8ff",
        windowBorder: "2px solid #1890ff",
        windowShadow: "inset 0 0 20px rgba(24, 144, 255, 0.2)",
        emojiClass: "bandit-spinning-emoji",
        emojiScale: "scale(0.9)",
    },
    locked: {
        cardBorder: "2px solid #52c41a",
        cardShadow: "0 0 15px rgba(82, 196, 26, 0.6)",
        cardBackground: "#f6ffed",
        windowBorder: "2px solid #52c41a",
        windowShadow: "inset 0 0 20px rgba(82, 196, 26, 0.3)",
        emojiClass: "bandit-locked-emoji",
        emojiScale: "scale(1.1)",
    },
};

function ReelCard({ reel }: { reel: Reel }) {
    const { t } = useTranslation();
    const look = LOOKS[reel.status];
    const spinning = reel.status === "spinning";
    const item = reel.items[reel.index];

    return (
        <Card
            style={{
                height: "100%",
                border: look.cardBorder,
                boxShadow: look.cardShadow,
                transition: "all 0.3s ease",
                backgroundColor: look.cardBackground,
            }}
            bodyStyle={{
                padding: "16px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "250px",
            }}
        >
            <div style={{
                width: "100%",
                height: "200px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
                borderRadius: "8px",
                backgroundColor: "#fafafa",
                border: look.windowBorder,
                boxShadow: look.windowShadow,
                transition: "all 0.3s ease",
            }}>
                {item ? (
                    <div style={{
                        textAlign: "center",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "12px",
                    }}>
                        <div
                            className={look.emojiClass}
                            style={{
                                fontSize: "80px",
                                lineHeight: "1",
                                transform: look.emojiScale,
                                transition: "transform 0.3s ease, opacity 0.3s ease",
                                opacity: spinning ? 0.8 : 1,
                                filter: spinning ? "blur(2px)" : "none",
                                marginBottom: "16px",
                            }}
                        >
                            {reel.emoji}
                        </div>
                        <div style={{
                            width: "100%",
                            padding: "0 8px",
                            opacity: spinning ? 0.6 : 1,
                            transition: "opacity 0.3s ease",
                            display: "flex",
                            justifyContent: "center",
                        }}>
                            <IngredientDisplay ingredient={item} variant="compact" showIcon={true} showTags={false} />
                        </div>
                    </div>
                ) : (
                    <Text type="secondary">{t("generate.banditNoItems") || "No items"}</Text>
                )}
            </div>
        </Card>
    );
}

/** The reels side by side, each showing its current ingredient and emoji. */
export function BanditReels({ reels }: { reels: Reel[] }) {
    const span = columnSpan(reels.length);
    return (
        <Row gutter={[16, 16]} style={{ marginBottom: "16px", minHeight: "300px" }}>
            {reels.map((reel, index) => (
                <Col key={index} {...span}>
                    <ReelCard reel={reel} />
                </Col>
            ))}
        </Row>
    );
}
