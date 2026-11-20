import { Card, Col, Form, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { CountStepper } from "../CountStepper";
import styles from "../GenerateView/GenerateView.module.css";

const { Text } = Typography;

interface ColumnCountControlProps {
    value: number;
    max: number;
    onChange: (value: number) => void;
    disabled: boolean;
}

/** How many reels to spin, from 1 to `max`. */
export function ColumnCountControl({ value, max, onChange, disabled }: ColumnCountControlProps) {
    const { t } = useTranslation();

    return (
        <Row gutter={[24, 24]} className={styles.marginBottom32}>
            <Col span={24}>
                <Card className={styles.cardNoMargin} classNames={{ body: styles.cardBody }}>
                    <Form.Item className="mb-0">
                        <div className={`${styles.flexColumn} ${styles.gap16}`}>
                            <div className={styles.optionHeader}>
                                <div className={styles.subtitle}>{t("generate.banditColumnCount")}</div>
                                {max > 0 && (
                                    <Text type="secondary" className={styles.textSecondary}>
                                        {t("generate.banditColumnCountHelp")} (1-{max})
                                    </Text>
                                )}
                            </div>
                            <CountStepper
                                value={value}
                                min={1}
                                max={max}
                                disabled={disabled}
                                onDecrement={() => onChange(Math.max(1, value - 1))}
                                onIncrement={() => onChange(Math.min(max, value + 1))}
                                onChange={onChange}
                            />
                        </div>
                    </Form.Item>
                </Card>
            </Col>
        </Row>
    );
}
