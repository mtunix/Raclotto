import { Card, Col, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { columnSpan } from "./reelSpin";
import "./bandit.css";

const { Text } = Typography;

const restingShadow = "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.1)";
const hoverShadow = "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.15)";

interface SlotMachineProps {
    columns: number;
    canSpin: boolean;
    onSpin: () => void;
}

/** The machine at rest: `columns` covered reels and the lever, the whole of it clickable when it can spin. */
export function SlotMachine({ columns, canSpin, onSpin }: SlotMachineProps) {
    const { t } = useTranslation();
    const span = columnSpan(columns);

    return (
        <Card
            style={{
                background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)",
                border: "3px solid #4a5568",
                borderRadius: "16px",
                boxShadow: restingShadow,
                cursor: canSpin ? "pointer" : "not-allowed",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
            }}
            styles={{
                body: {
                    padding: "40px",
                    minHeight: "400px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                },
            }}
            onClick={canSpin ? onSpin : undefined}
            onMouseEnter={(e) => {
                if (canSpin) {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = hoverShadow;
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = restingShadow;
            }}
        >
            <div style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                right: "20px",
                height: "60px",
                background: "linear-gradient(180deg, rgba(255, 215, 0, 0.3) 0%, transparent 100%)",
                borderRadius: "8px",
                border: "2px solid rgba(255, 215, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <Text style={{
                    color: "#ffd700",
                    fontSize: "24px",
                    fontWeight: "bold",
                    textShadow: "0 0 10px rgba(255, 215, 0, 0.8)",
                    letterSpacing: "4px",
                }}>
                    🎰 RACLOTTO 🎰
                </Text>
            </div>

            <Row gutter={16} style={{ width: "100%", marginTop: "100px", marginBottom: "40px" }}>
                {Array.from({ length: columns }, (_, index) => (
                    <Col key={index} {...span}>
                        <div style={{
                            height: "200px",
                            background: "linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)",
                            border: "3px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "12px",
                            boxShadow: "inset 0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            overflow: "hidden",
                        }}>
                            <div style={{
                                fontSize: "60px",
                                opacity: 0.6,
                                animation: "mysteryPulse 2s ease-in-out infinite",
                                filter: "blur(1px)",
                            }}>
                                {index % 2 === 0 ? "❓" : "✨"}
                            </div>
                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: "-100%",
                                width: "100%",
                                height: "100%",
                                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                                animation: "shine 3s infinite",
                            }} />
                        </div>
                    </Col>
                ))}
            </Row>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
                <div style={{
                    display: "inline-block",
                    padding: "16px 32px",
                    background: canSpin
                        ? "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)"
                        : "linear-gradient(135deg, #666 0%, #555 100%)",
                    border: "3px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "12px",
                    boxShadow: canSpin
                        ? "0 4px 16px rgba(255, 107, 107, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)"
                        : "0 4px 16px rgba(0, 0, 0, 0.3)",
                    cursor: canSpin ? "pointer" : "not-allowed",
                    transition: "all 0.3s ease",
                }}>
                    <Text style={{
                        color: "white",
                        fontSize: "18px",
                        fontWeight: "bold",
                        textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                        display: "block",
                    }}>
                        {canSpin
                            ? (t("generate.banditSpin") || "Pull the Lever! 🎰")
                            : (t("generate.banditCannotSpin") || "Cannot Spin")}
                    </Text>
                </div>
            </div>
        </Card>
    );
}
