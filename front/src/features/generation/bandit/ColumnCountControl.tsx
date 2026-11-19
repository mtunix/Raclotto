import React from "react";
import { Button, Card, Col, Form, Input, InputNumber, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import styles from "../GenerateView/GenerateView.module.css";

const { Text } = Typography;

function hoverHighlight(enabled: boolean) {
    return {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            if (!enabled) return;
            e.currentTarget.style.background = "#f5f5f7";
            e.currentTarget.style.borderColor = "#0071e3";
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
            if (!enabled) return;
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#d2d2d7";
        },
    };
}

interface ColumnCountControlProps {
    value: number;
    max: number;
    onChange: (value: number) => void;
    disabled: boolean;
}

/** How many reels to spin, from 1 to `max`. */
export function ColumnCountControl({ value, max, onChange, disabled }: ColumnCountControlProps) {
    const { t } = useTranslation();
    const canDecrease = value > 1 && !disabled;
    const canIncrease = value < max && !disabled;

    return (
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
            <Col span={24}>
                <Card
                    style={{ borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "none" }}
                    bodyStyle={{ padding: "24px" }}
                >
                    <Form.Item style={{ marginBottom: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px" }}>
                                <div style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.022em", color: "#1d1d1f" }}>
                                    {t("generate.banditColumnCount") || "Number of Columns"}
                                </div>
                                {max > 0 && (
                                    <Text type="secondary" style={{ fontSize: "15px" }}>
                                        {t("generate.banditColumnCountHelp") || "Choose how many columns to spin"} (1-{max})
                                    </Text>
                                )}
                            </div>
                            <Input.Group compact style={{ display: "flex", gap: "8px" }}>
                                <Button
                                    onClick={() => onChange(Math.max(1, value - 1))}
                                    disabled={!canDecrease}
                                    className={styles.incrementButton}
                                    {...hoverHighlight(canDecrease)}
                                >
                                    −
                                </Button>
                                <InputNumber
                                    min={1}
                                    max={max}
                                    value={value}
                                    onChange={(next) => onChange(Math.max(1, Math.min(next || 1, max)))}
                                    size="large"
                                    className={styles.inputNumber}
                                    controls={false}
                                    disabled={disabled}
                                />
                                <Button
                                    onClick={() => onChange(Math.min(max, value + 1))}
                                    disabled={!canIncrease}
                                    className={styles.incrementButton}
                                    {...hoverHighlight(canIncrease)}
                                >
                                    +
                                </Button>
                            </Input.Group>
                        </div>
                    </Form.Item>
                </Card>
            </Col>
        </Row>
    );
}
